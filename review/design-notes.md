# Gate 1 design direction

- Palette: background #0B0C0F, foreground #F2F4F8, card #14171D, accent #C8FF2E, muted #989DA7, border #292D34. All application colors reference CSS tokens.
- Type: Instrument Serif for the editorial question; DM Sans for controls and explanation; system monospace for MongoDB syntax.
- Layout: centered, oversized two-line question → primary console action → wide illustrative prompt/query panel → concise product explanation. The preview splits trace and MongoDB source on desktop and stacks on mobile.
- Distinctive choice: the database's actual query grammar and the movie dataset drive the visual centerpiece. No invented performance statistics or fake result cards.
- Brief review: the dark/lime palette is explicitly requested. Retained that palette while removing generic metric tiles, rainbow code syntax, and decorative badge clusters. Accent is limited to primary actions and small highlights.
- Motion: one finite CSS headline shimmer, plus interaction transitions. All motion disabled for reduced-motion users.
- Gate boundary: no Atlas calls, model calls, or fabricated live traces. Console is explicitly identified as pending implementation.

Review question for Chenyun: **Premium or template-y?**
