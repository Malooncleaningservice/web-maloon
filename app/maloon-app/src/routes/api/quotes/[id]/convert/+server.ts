import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const POST: RequestHandler = apiHandler(async ({ params }) => {
	const quote = await prisma.quote.findUnique({
		where: { id: params.id },
		include: { quoteLineItems: true, quoteAddons: true }
	});

	if (!quote) return json({ error: 'Quote not found' }, { status: 404 });

	// Get or create business
	const business = await prisma.business.findFirst();
	let businessId = business?.id;
	if (!businessId) {
		const newBusiness = await prisma.business.create({
			data: { name: 'Maloon Service', slug: 'maloon-services' }
		});
		businessId = newBusiness.id;
	}

	// Create the job
	const job = await prisma.job.create({
		data: {
			businessId,
			quoteId: quote.id,
			clientId: quote.clientId,
			clientName: quote.clientName ?? 'Unknown Client',
			clientPhone: quote.clientPhone,
			clientEmail: quote.clientEmail,
			address: quote.address ?? '',
			status: 'pending',
			notes: quote.notes,
			// Create a section for each line item group
			sections: {
				create: groupLineItems(quote.quoteLineItems, quote.quoteAddons)
			}
		},
		include: {
			sections: { include: { tasks: true } },
			startWithTasks: true
		}
	});

	// Update quote status
	await prisma.quote.update({
		where: { id: quote.id },
		data: { status: 'accepted' }
	});

	return json(job, { status: 201 });
});

/** Group quote line items and add-ons into job sections with tasks */
function groupLineItems(
	lineItems: Array<{ name: string; price: number; size: string | null; quantity: number }>,
	addons: Array<{ name: string; price: number }>
) {
	const sections: Array<{ name: string; sortOrder: number; tasks: { create: Array<{ description: string; sortOrder: number; requiredPhoto: boolean }> } }> = [];

	// Group line items by base name (strip size suffix)
	const groups = new Map<string, typeof lineItems>();
	for (const item of lineItems) {
		// Extract base name (remove size suffix like " (Small)")
		const baseName = item.name.replace(/\s*\(.*\)$/, '').trim();
		if (!groups.has(baseName)) groups.set(baseName, []);
		groups.get(baseName)!.push(item);
	}

	let sectionOrder = 0;
	let taskCounter = 0;

	// Create sections from line items
	for (const [name, items] of groups) {
		taskCounter++;
		sections.push({
			name,
			sortOrder: sectionOrder++,
			tasks: {
				create: items.map((item, i) => ({
					description: item.size ? `${item.name} — ${item.quantity}× @ $${item.price.toFixed(2)}/ea` : `Clean ${item.name} — $${item.price.toFixed(2)}`,
					sortOrder: i,
					requiredPhoto: false,
				}))
			}
		});
	}

	// Add-ons go into their own section
	if (addons.length > 0) {
		sections.push({
			name: 'Custom Requests',
			sortOrder: sectionOrder++,
			tasks: {
				create: addons.map((addon, i) => ({
					description: `${addon.name} — $${addon.price.toFixed(2)}`,
					sortOrder: i,
					requiredPhoto: false,
				}))
			}
		});
	}

	return sections;
}
