import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/jobs/[id]/assign — get assignments for a job
export const GET: RequestHandler = async ({ params }) => {
	const assignments = await prisma.jobAssignment.findMany({
		where: { jobId: params.id },
		include: { worker: true }
	});
	return json(assignments);
};

// POST /api/jobs/[id]/assign — assign a worker to a job
export const POST: RequestHandler = async ({ params, request }) => {
	const { workerId } = await request.json();
	const assignment = await prisma.jobAssignment.create({
		data: { jobId: params.id, workerId }
	});
	return json(assignment, { status: 201 });
};

// DELETE /api/jobs/[id]/assign — remove a worker assignment
export const DELETE: RequestHandler = async ({ params, request }) => {
	const { assignmentId } = await request.json();
	await prisma.jobAssignment.delete({ where: { id: assignmentId } });
	return json({ success: true });
};
