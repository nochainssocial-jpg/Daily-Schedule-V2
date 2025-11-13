# Theme & Wiring Patch (No logic changes)
This patch **does not alter your store logic**. It provides a theme CSS and thin page wrappers so you keep your existing functionality while getting the updated layout/colours.

## Files
- styles/schedule-theme.css
- components/ui/ChipTheme.tsx
- components/pages/DropoffsPage.tsx
- components/pages/PickupsPage.tsx

## How to use
Update your routes to render these thin wrappers:

### Drop-offs
```tsx
import DropoffsPage from "@/components/pages/DropoffsPage";
export default function Page(){ return <DropoffsPage/>; }
```

### Pick-ups
```tsx
import PickupsPage from "@/components/pages/PickupsPage";
export default function Page(){ return <PickupsPage/>; }
```

These components call the **existing** store selectors/actions you already have (`toggleHelper`, `assignParticipantToDropoff`, `assignParticipantToPickup`, etc.). If any selector has a slightly different name in your store, adjust the import line accordingly.
