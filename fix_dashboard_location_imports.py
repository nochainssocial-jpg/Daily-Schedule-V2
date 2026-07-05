from pathlib import Path
import re

root = Path.cwd()
dashboard_path = root / "app" / "dashboard.tsx"
locations_path = root / "lib" / "locations.ts"

if not dashboard_path.exists():
    raise SystemExit("Could not find app/dashboard.tsx. Run this from the project root.")
if not locations_path.exists():
    raise SystemExit("Could not find lib/locations.ts. Run this from the project root.")

locations = locations_path.read_text()

# Ensure normalizeLocationId exists
if "export function normalizeLocationId" not in locations:
    insert = """
export function normalizeLocationId(value?: string | null): LocationId {
  if (value === 'social_hub') return 'social_hub';
  return 'day_program';
}
"""
    locations = locations.rstrip() + "\n" + insert + "\n"

# Ensure getLocationLabel exists
if "export function getLocationLabel" not in locations:
    insert = """
export function getLocationLabel(locationId?: string | null) {
  const normalisedLocationId = normalizeLocationId(locationId);
  return LOCATIONS.find(location => location.id === normalisedLocationId)?.label ?? 'Day Program';
}
"""
    locations = locations.rstrip() + "\n" + insert + "\n"

locations_path.write_text(locations)

text = dashboard_path.read_text()

required = ["getLocationLabel", "normalizeLocationId"]
patterns = [
    r"import\s+\{([^}]+)\}\s+from\s+['\"]@/lib/locations['\"];",
    r"import\s+\{([^}]+)\}\s+from\s+['\"]\.\./lib/locations['\"];",
]

matched = False
for pattern in patterns:
    m = re.search(pattern, text, flags=re.S)
    if m:
        matched = True
        imports = [item.strip() for item in m.group(1).replace("\n", " ").split(",") if item.strip()]
        for name in required:
            if name not in imports:
                imports.append(name)
        # Keep @ alias if that is what the file already used, otherwise use relative path.
        import_path = "@/lib/locations" if "@/lib/locations" in m.group(0) else "../lib/locations"
        new_import = "import { " + ", ".join(imports) + f" }} from \"{import_path}\";"
        text = re.sub(pattern, new_import, text, count=1, flags=re.S)
        break

if not matched:
    text = 'import { getLocationLabel, normalizeLocationId } from "@/lib/locations";\n' + text

# Remove possible duplicate standalone import created by earlier quick fixes.
text = re.sub(
    r"import\s+\{\s*normalizeLocationId\s*\}\s+from\s+['\"]\.\./lib/locations['\"];\n",
    "",
    text,
)

# If there is an activeLocationLabel line but no activeLocationId line, add a safe fallback. This should not normally happen.
if "const activeLocationLabel = getLocationLabel(activeLocationId);" in text and "const activeLocationId = normalizeLocationId" not in text:
    text = text.replace(
        "const activeLocationLabel = getLocationLabel(activeLocationId);",
        "const activeLocationId = normalizeLocationId(undefined);\nconst activeLocationLabel = getLocationLabel(activeLocationId);",
        1,
    )

dashboard_path.write_text(text)
print("Fixed dashboard location imports and location helper exports.")
