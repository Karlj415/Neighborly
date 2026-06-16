# Social Real Estate Reusable Kit

This folder contains reusable code from the old Neighborly project. It is meant for the next website, which is closer to a social network for real estate.

The code is plain TypeScript. It does not depend on React, Express, Drizzle, Tailwind, shadcn, or the old project structure.

## Files

- `social-real-estate-kit.ts`: reusable types and helper functions.
- `README.md`: this guide.

## What This Code Can Do

- Normalize property listings from multiple sources into one predictable shape.
- Format rent, property stats, locations, and property share messages.
- Build a mixed feed containing both property listings and social posts.
- Score feed items using simple ranking rules.
- Calculate renter trust scores.
- Calculate roommate/lifestyle compatibility scores.
- Create public-safe renter profiles that respect privacy toggles.
- Check whether a renter has all required application documents.
- Convert post categories into display labels.

## Suggested Use In The Next Project

Copy `social-real-estate-kit.ts` into a shared folder in the new app, such as:

```txt
src/lib/social-real-estate-kit.ts
```

Then import only the functions you need:


import {
  createFeedItems,
  createPublicRenterProfile,
  normalizeProperty,
} from "./social-real-estate-kit";


## Example


const property = normalizeProperty({
  id: "zpid-123",
  source: "zillow",
  address: "123 Main St",
  city: "Dallas",
  state: "TX",
  rent: "2450",
  bedrooms: 2,
  bathrooms: 2,
  images: ["https://example.com/home.jpg"],
});

const feed = createFeedItems({
  properties: [property],
  posts: [
    {
      id: 1,
      userId: "user-1",
      title: "Looking for a roommate",
      content: "Moving next month and looking near downtown.",
      category: "roommates",
      city: "Dallas",
      state: "TX",
      zipCode: "75201",
      createdAt: new Date(),
    },
  ],
  preferredZipCode: "75201",
});

const publicProfile = createPublicRenterProfile({
  id: "user-1",
  firstName: "Taylor",
  lastName: "Smith",
  email: "taylor@example.com",
  phone: "555-555-5555",
  monthlyIncome: 9000,
  sharePhone: false,
  shareIncome: true,
});


## Developer Notes

- Use `normalizeProperty` before rendering property data from any external API.
- Do not render a full `RenterProfile` publicly. Use `createPublicRenterProfile`.
- Feed scores are intentionally simple. You can change the point values in `calculatePropertyFeedScore` and `calculatePostFeedScore`.
- Keep database code separate from this file. These are app-level types and helpers, not migrations.
- Keep API-specific cleanup separate. Convert API responses into `PortableProperty`, then call `normalizeProperty`.
