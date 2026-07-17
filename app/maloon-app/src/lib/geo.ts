// Geocoding + geofence helpers. Uses free OpenStreetMap Nominatim (no API key).
// Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
// - Max 1 request/sec, requires a descriptive User-Agent / Referer.
// We only geocode on job create / address change (rare), so we stay well within limits.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const UA = process.env.NOMINATIM_USER_AGENT
	|| 'Maloon-Service-App/1.0 (https://maloon.com; contact@maloon.com)';

export interface LatLng {
	lat: number;
	lon: number;
}

export interface ReverseGeocodeResult {
	displayName: string;
	address: {
		house_number?: string;
		road?: string;
		city?: string;
		town?: string;
		village?: string;
		county?: string;
		state?: string;
		postcode?: string;
		country?: string;
		[key: string]: string | undefined;
	};
}

/** Forward-geocode a free-text address to lat/long. Returns null if not found. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
	if (!address || address.trim().length < 3) return null;
	const q = encodeURIComponent(address.trim());
	const url = `${NOMINATIM_BASE}/search?format=jsonv2&q=${q}&limit=1&addressdetails=1`;
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': UA,
				'Accept-Language': 'en',
			},
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			console.warn(`[geo] Nominatim search HTTP ${res.status}`);
			return null;
		}
		const data = (await res.json()) as Array<{ lat: string; lon: string }>;
		if (!data || data.length === 0) return null;
		const { lat, lon } = data[0];
		const latN = parseFloat(lat);
		const lonN = parseFloat(lon);
		if (Number.isNaN(latN) || Number.isNaN(lonN)) return null;
		return { lat: latN, lon: lonN };
	} catch (err) {
		console.warn('[geo] geocodeAddress failed:', (err as Error).message);
		return null;
	}
}

/** Reverse-geocode lat/long to a human-readable address. Returns null on failure. */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult | null> {
	const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`;
	try {
		const res = await fetch(url, {
			headers: {
				'User-Agent': UA,
				'Accept-Language': 'en',
			},
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			console.warn(`[geo] Nominatim reverse HTTP ${res.status}`);
			return null;
		}
		const data = (await res.json()) as ReverseGeocodeResult & { display_name?: string };
		if (!data || !data.display_name) return null;
		return {
			displayName: data.display_name,
			address: data.address || {},
		};
	} catch (err) {
		console.warn('[geo] reverseGeocode failed:', (err as Error).message);
		return null;
	}
}

/**
 * Build a compact one-line address for the photo stamp:
 * "123 Main St, Springfield, IL 62704"
 * Falls back to `displayName` (full Nominatim string) if components are missing.
 */
export function formatAddressForStamp(r: ReverseGeocodeResult | null): string {
	if (!r) return 'Unknown location';
	const a = r.address;
	const street = [a.house_number, a.road].filter(Boolean).join(' ');
	const city = a.city || a.town || a.village || a.county || '';
	const state = a.state || '';
	const postcode = a.postcode || '';
	// Prefer the short "Street, City, State ZIP" form.
	const parts = [street, city, [state, postcode].filter(Boolean).join(' ')].filter(Boolean);
	if (parts.length > 0) return parts.join(', ');
	// Last-ditch fallback: trim the long display name.
	return r.displayName.length > 80 ? r.displayName.slice(0, 77) + '…' : r.displayName;
}

/** Great-circle distance between two lat/long points, in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
	const R = 6371000; // Earth radius in meters
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLon = toRad(b.lon - a.lon);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const sinDLat = Math.sin(dLat / 2);
	const sinDLon = Math.sin(dLon / 2);
	const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
	return 2 * R * Math.asin(Math.sqrt(h));
}

/** Geofence radius (meters). Workers must be within this distance of the job site. */
export const GEOFENCE_RADIUS_METERS = 150;
