import { json } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/prisma';
import { apiHandler } from '$lib/api-error';
import { processTaskPhoto } from '$lib/image';
import {
	reverseGeocode,
	formatAddressForStamp,
	haversineMeters,
	GEOFENCE_RADIUS_METERS,
} from '$lib/geo';

// Override the default 512KB limit — camera photos are 5-15MB raw.
// sharp resizes them server-side, but the body must be received first.
export const config = {
	bodySizeLimit: '20M',
};

export const POST: RequestHandler = apiHandler(async ({ request, url, locals }: RequestEvent) => {
	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) return json({ error: 'No file provided' }, { status: 400 });

	const type = url.searchParams.get('type') ?? 'generic';
	const workerIdParam = url.searchParams.get('workerId');
	const taskId = url.searchParams.get('taskId');

	// Convert file to base64 data URL (for w9/generic — unprocessed)
	const buffer = Buffer.from(await file.arrayBuffer());
	const mimeType = file.type || 'application/octet-stream';
	const base64 = buffer.toString('base64');
	const dataUrl = `data:${mimeType};base64,${base64}`;

	if (type === 'w9' && workerIdParam) {
		await prisma.worker.update({
			where: { id: workerIdParam },
			data: {
				w9Uploaded: true,
				w9FileName: file.name,
				w9FileUrl: dataUrl,
			}
		});
		return json({ success: true, url: dataUrl, fileName: file.name });
	}

	if (type === 'task-photo' && taskId) {
		// --- Authorization: worker must own the task's job ---
		const user = locals.user;
		const isAdmin = user?.role === 'admin';

		let workerId: string | null = user?.workerId ?? null;

		// Admins may upload on a worker's behalf; resolve the task's job to attribute the photo.
		if (isAdmin && !workerId) {
			workerId = null; // admin-uploaded photos are unattributed
		} else if (!workerId) {
			return json({ error: 'Worker account required' }, { status: 403 });
		}

		// Resolve the task and its job, and confirm the worker is assigned (if worker).
		const task = await prisma.jobTask.findUnique({
			where: { id: taskId },
			include: {
				section: { select: { job: { select: { id: true, address: true, latitude: true, longitude: true } } } },
				photos: { select: { id: true } },
			},
		});
		if (!task) return json({ error: 'Task not found' }, { status: 404 });
		const job = task.section?.job;
		if (!job) return json({ error: 'Job not found' }, { status: 404 });

		if (!isAdmin && workerId) {
			const assignment = await prisma.jobAssignment.findFirst({
				where: { jobId: job.id, workerId },
				select: { id: true },
			});
			if (!assignment) {
				return json({ error: 'You are not assigned to this job' }, { status: 403 });
			}
		}

		// --- Geolocation ---
		// Required for workers (geofence + stamp). Optional for admins, who
		// upload from a desktop and may not have GPS — we fall back to the job's
		// cached address for the stamp and skip the geofence.
		const latRaw = formData.get('latitude');
		const lonRaw = formData.get('longitude');
		const accRaw = formData.get('accuracy');
		const takenAtRaw = formData.get('photoTakenAt');

		const photoTakenAt = takenAtRaw ? new Date(String(takenAtRaw)) : new Date();

		let latitude: number | null = latRaw ? parseFloat(String(latRaw)) : null;
		let longitude: number | null = lonRaw ? parseFloat(String(lonRaw)) : null;
		const accuracy: number | null = accRaw ? parseFloat(String(accRaw)) : null;

		if (latitude != null && Number.isNaN(latitude)) latitude = null;
		if (longitude != null && Number.isNaN(longitude)) longitude = null;
		const accuracyMeters = accuracy != null && !Number.isNaN(accuracy) ? accuracy : null;

		// Workers MUST send GPS. Admins may omit it.
		if (!isAdmin && (latitude == null || longitude == null)) {
			return json(
				{ error: 'Location permission is required to upload photos. Please enable location and try again.' },
				{ status: 400 }
			);
		}

		// --- Geofence check (workers only, requires both worker GPS and job coords) ---
		let distanceMeters: number | null = null;
		if (!isAdmin && latitude != null && longitude != null && job.latitude != null && job.longitude != null) {
			distanceMeters = haversineMeters(
				{ lat: latitude, lon: longitude },
				{ lat: job.latitude, lon: job.longitude }
			);
			if (distanceMeters > GEOFENCE_RADIUS_METERS) {
				const rounded = Math.round(distanceMeters);
				return json(
					{
						error: `You're about ${rounded} m from the job site — photos can only be taken within ${GEOFENCE_RADIUS_METERS} m. Please move closer and try again.`,
						code: 'OUTSIDE_GEOFENCE',
						distanceMeters: rounded,
						geofenceRadius: GEOFENCE_RADIUS_METERS,
					},
					{ status: 403 }
				);
			}
		}

		// --- Reverse-geocode for the stamp ---
		// Workers: use their GPS position. Admins (no GPS): fall back to the job's
		// address. Soft-fail to "Unknown location" if Nominatim is unavailable.
		let addressLine: string;
		if (latitude != null && longitude != null) {
			const reverse = await reverseGeocode(latitude, longitude);
			addressLine = formatAddressForStamp(reverse);
		} else if (job.address) {
			addressLine = job.address;
		} else {
			addressLine = 'Unknown location';
		}

		// --- Image processing: resize + stamp + compress ---
		const processedUrl = await processTaskPhoto(buffer, {
			timestamp: photoTakenAt,
			addressLine,
		});

		// --- Persist ---
		const photo = await prisma.taskPhoto.create({
			data: {
				taskId,
				url: processedUrl,
				takenBy: workerId,
				latitude,
				longitude,
				locationAccuracy: accuracyMeters,
				photoTakenAt,
			}
		});
		return json({ success: true, photo });
	}

	return json({ success: true, url: dataUrl, fileName: file.name });
});
