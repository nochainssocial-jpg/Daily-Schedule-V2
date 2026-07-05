from pathlib import Path
import re

root = Path.cwd()

locations_path = root / "lib" / "locations.ts"
dashboard_path = root / "app" / "dashboard.tsx"

if not locations_path.exists():
    raise SystemExit("Could not find lib/locations.ts")

if not dashboard_path.exists():
    raise SystemExit("Could not find app/dashboard.tsx")

locations = locations_path.read_text()

if "normalizeLocationId" not in locations:
    insert = """

export function normalizeLocationId(value?: string | null): LocationId {
  if (value === 'social_hub') return 'social_hub';
  return DEFAULT_LOCATION_ID;
}
"""
    # Prefer placing before getLocationLabel if present
    if "export function getLocationLabel" in locations:
        locations = locations.replace("export function getLocationLabel", insert + "\nexport function getLocationLabel", 1)
    else:
        locations = locations.rstrip() + insert + "\n"
    locations_path.write_text(locations)
    print("Added normalizeLocationId to lib/locations.ts")
else:
    print("normalizeLocationId already exists in lib/locations.ts")

dashboard = dashboard_path.read_text()

# Update existing import from lib/locations if present
patterns = [
    r"import\s+\{([^}]+)\}\s+from\s+['\"]\.\./lib/locations['\"];",
    r"import\s+\{([^}]+)\}\s+from\s+['\"]@/lib/locations['\"];",
]

updated = False
for pattern in patterns:
    match = re.search(pattern, dashboard, flags=re.S)
    if match:
        imports = [item.strip() for item in match.group(1).replace("\n", " ").split(",") if item.strip()]
        if "normalizeLocationId" not in imports:
            imports.append("normalizeLocationId")
            new_import = "import { " + ", ".join(imports) + " } from '../lib/locations';"
            dashboard = re.sub(pattern, new_import, dashboard, count=1, flags=re.S)
            print("Added normalizeLocationId to dashboard location import")
        else:
            print("dashboard.tsx already imports normalizeLocationId")
        updated = True
        break

if not updated:
    # Add import near the top
    dashboard = "import { normalizeLocationId } from '../lib/locations';\n" + dashboard
    print("Added new normalizeLocationId import to dashboard.tsx")

dashboard_path.write_text(dashboard)

print("Location PIN crash fix complete.")
