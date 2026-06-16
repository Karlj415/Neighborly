# Social Real Estate Reusable Kit

This folder contains portable code extracted from the old Neighborly app for the next project. It is intentionally free of React, Express, database, auth, Tailwind, and shadcn dependencies so it can be copied into a Next.js, Vite, mobile, or backend package.

## File

- `social-real-estate-kit.ts`: shared types and pure helpers for property normalization, feed ranking, trust scoring, roommate compatibility, post categories, document requirements, property sharing, and renter privacy.

## Best Reuse Targets

- Normalize listings from internal data, Zillow/RentCast-style data, or manual landlord posts into one `NormalizedProperty`.
- Create a mixed social feed of property posts and community posts with `createFeedItems`.
- Keep sensitive renter data private by default with `createPublicRenterProfile`.
- Reuse current trust-score weights with `calculateTrustScore`.
- Reuse roommate quiz matching without depending on Drizzle or the old API route with `calculateCompatibility`.
- Reuse rental application document checks with `checkDocumentRequirements`.

## Example

```ts
import {
  createFeedItems,
  createPublicRenterProfile,
  normalizeProperty,
} from "./social-real-estate-kit";

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
  posts: [],
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
```

## Notes For The Next Build

- Treat this as a starting domain package, not a UI kit. Rebuild visual components around the next product's design system.
- Keep external API adapters separate. Convert third-party listing responses into `PortableProperty`, then call `normalizeProperty`.
- Keep database schemas separate. These types describe app-level contracts, not storage migrations.
