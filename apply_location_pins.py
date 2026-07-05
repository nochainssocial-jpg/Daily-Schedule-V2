from pathlib import Path
import re

ROOT = Path.cwd()

def read(path):
    p = ROOT / path
    if not p.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    return p.read_text()

def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    print(f"updated {path}")

# 1) Location definitions + PIN helpers
write("lib/locations.ts", """export type LocationId = 'day_program' | 'social_hub';

export type LocationOption = {
  id: LocationId;
  label: string;
  shortLabel: string;
};

export const LOCATIONS: LocationOption[] = [
  {
    id: 'day_program',
    label: 'Day Program',
    shortLabel: 'Day Program',
  },
  {
    id: 'social_hub',
    label: 'Social Hub',
    shortLabel: 'Social Hub',
  },
];

export const DEFAULT_LOCATION_ID: LocationId = 'day_program';
export const LEGACY_DAY_PROGRAM_HOUSE_ID = 'B2';

export const LOCATION_PINS: Record<LocationId, string> = {
  day_program: '1935',
  social_hub: '5391',
};

export function normalizeLocationId(value?: string | null): LocationId {
  if (value === 'social_hub') return 'social_hub';
  return 'day_program';
}

export function getLocationLabel(locationId?: string | null) {
  const normalisedLocationId = normalizeLocationId(locationId);
  return LOCATIONS.find(location => location.id === normalisedLocationId)?.label ?? 'Day Program';
}

export function isLocationId(value: string): value is LocationId {
  return value === 'day_program' || value === 'social_hub';
}

export function getLocationForPin(pin?: string | null): LocationOption | null {
  const trimmedPin = String(pin || '').trim();
  const locationId = LOCATIONS.find(location => LOCATION_PINS[location.id] === trimmedPin)?.id;
  if (!locationId) return null;
  return LOCATIONS.find(location => location.id === locationId) ?? null;
}

export function getScheduleLocationId(snapshotOrState?: any): LocationId {
  return normalizeLocationId(
    snapshotOrState?.currentLocationId ??
      snapshotOrState?.meta?.locationId ??
      snapshotOrState?.meta?.house ??
      snapshotOrState?.house,
  );
}
""")

# 2) Routes
routes_path = "constants/ROUTES.ts"
routes = read(routes_path)
if "LOCATION_ACCESS" not in routes:
    routes = routes.replace("  SHARE: '/share-schedule',\n", "  SHARE: '/share-schedule',\n  LOCATION_ACCESS: '/location-access',\n  DASHBOARD: '/dashboard',\n")
write(routes_path, routes)

# 3) DashboardFrame accepts location label
frame_path = "components/dashboard/DashboardFrame.tsx"
frame = read(frame_path)
frame = frame.replace('import { DASHBOARD_REFRESH_MS, HOUSE_ID, ROTATE_MS, pageLabel } from "./dashboardTheme";', 'import { DASHBOARD_REFRESH_MS, ROTATE_MS, pageLabel } from "./dashboardTheme";')
if "locationLabel: string;" not in frame:
    frame = frame.replace("  pageTheme: { background: string; accent: string };\n  children: React.ReactNode;", "  pageTheme: { background: string; accent: string };\n  locationLabel: string;\n  children: React.ReactNode;")
if "locationLabel," not in frame.split("}: Props)")[0]:
    frame = frame.replace("  pageTheme,\n  children,", "  pageTheme,\n  locationLabel,\n  children,")
frame = frame.replace('Location: {HOUSE_ID} Day Program', 'Location: {locationLabel}')
write(frame_path, frame)

# 4) Dashboard reads locationId query parameter and loads that location
path = "app/dashboard.tsx"
dash = read(path)
if 'import { useLocalSearchParams } from "expo-router";' not in dash:
    dash = dash.replace('import React, { useEffect, useMemo, useState } from "react";\n', 'import React, { useEffect, useMemo, useState } from "react";\nimport { useLocalSearchParams } from "expo-router";\n')
dash = dash.replace('import { LEGACY_DAY_PROGRAM_HOUSE_ID } from "@/lib/locations";', 'import { getLocationLabel, LEGACY_DAY_PROGRAM_HOUSE_ID, normalizeLocationId } from "@/lib/locations";')
dash = dash.replace('  HOUSE_ID,\n', '')
if 'const params = useLocalSearchParams' not in dash:
    dash = dash.replace(
        'const [eventsMeetingsVisits, setEventsMeetingsVisits] = useState<EventMeetingVisitRecord[]>([]);',
        'const [eventsMeetingsVisits, setEventsMeetingsVisits] = useState<EventMeetingVisitRecord[]>([]);\nconst params = useLocalSearchParams<{ locationId?: string }>();\nconst requestedLocationId = Array.isArray(params.locationId) ? params.locationId[0] : params.locationId;\nconst activeLocationId = normalizeLocationId(requestedLocationId);\nconst activeLocationLabel = getLocationLabel(activeLocationId);'
    )
dash = dash.replace('const eventHouseIds = HOUSE_ID === "day_program"\n? [HOUSE_ID, LEGACY_DAY_PROGRAM_HOUSE_ID]\n: [HOUSE_ID];', 'const eventHouseIds = activeLocationId === "day_program"\n? [activeLocationId, LEGACY_DAY_PROGRAM_HOUSE_ID]\n: [activeLocationId];')
dash = dash.replace('await initScheduleForToday(HOUSE_ID);', 'await initScheduleForToday(activeLocationId);')
dash = dash.replace('await refreshScheduleFromSupabase(HOUSE_ID);', 'await refreshScheduleFromSupabase(activeLocationId);')
# Only the first and second dashboard effects in this file are location sensitive; make empty dependency arrays active-location aware.
dash = dash.replace('}, []);\n\nuseEffect(() => {\nconst timer = setInterval(() => {', '}, [activeLocationId]);\n\nuseEffect(() => {\nconst timer = setInterval(() => {', 1)
dash = dash.replace('}, []);\n\nconst staffById = useMemo(', '}, [activeLocationId]);\n\nconst staffById = useMemo(', 1)
if 'locationLabel={activeLocationLabel}' not in dash:
    dash = dash.replace('  pageTheme={pageTheme}\n>', '  pageTheme={pageTheme}\n  locationLabel={activeLocationLabel}\n>')
write(path, dash)

# 5) Add location access screen
write("app/location-access.tsx", """import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Footer from '@/components/Footer';
import { getLocationForPin } from '@/lib/locations';
import { ROUTES } from '@/constants/ROUTES';

const MAX_WIDTH = 720;

export default function LocationAccessScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const pinRef = useRef<TextInput | null>(null);
  const showWebBranding = Platform.OS === 'web';

  useEffect(() => {
    pinRef.current?.focus?.();
  }, []);

  const handleSubmit = () => {
    const location = getLocationForPin(pin);

    if (!location) {
      setError('Incorrect location PIN');
      return;
    }

    setError('');
    setPin('');
    router.replace(`${ROUTES.DASHBOARD}?locationId=${encodeURIComponent(location.id)}` as any);
  };

  return (
    <View style={styles.screen}>
      {showWebBranding && (
        <Image
          source={require('../assets/images/nochains-bg.png')}
          style={styles.bgLogo}
          resizeMode="contain"
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Location access</Text>
          <Text style={styles.title}>Enter Location PIN</Text>
          <Text style={styles.description}>
            Enter the location PIN to open the correct dashboard schedule for this site.
          </Text>

          <TextInput
            ref={pinRef}
            value={pin}
            onChangeText={(text) => {
              setPin(text.replace(/[^0-9]/g, ''));
              if (error) setError('');
            }}
            placeholder="4-digit PIN"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.primaryButton}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryLabel}>Open Location Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace(ROUTES.HOME)}
            style={styles.secondaryButton}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryLabel}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf7fb',
    position: 'relative',
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 140,
  },
  card: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#ead6f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  eyebrow: {
    color: '#F54FA5',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    color: '#332244',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    color: '#6b5b78',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d8c6e4',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#332244',
    backgroundColor: '#fffafd',
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#F54FA5',
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#F54FA5',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryLabel: {
    color: '#F54FA5',
    fontSize: 15,
    fontWeight: '700',
  },
  bgLogo: {
    position: 'absolute',
    width: 1400,
    height: 1400,
    opacity: 0.1,
    left: -600,
    top: 10,
    pointerEvents: 'none',
  },
});
""")

# 6) Add a Home button for the location dashboard PIN screen
home_path = "app/home.tsx"
home = read(home_path)
if "Open Location Dashboard" not in home:
    home = home.replace(
        "            <TouchableOpacity\n              style={styles.primaryButton}\n              onPress={() => router.push(ROUTES.CREATE)}\n              activeOpacity={0.85}\n            >\n              <Text style={styles.primaryLabel}>Create Schedule</Text>\n            </TouchableOpacity>\n",
        "            <TouchableOpacity\n              style={styles.primaryButton}\n              onPress={() => router.push(ROUTES.CREATE)}\n              activeOpacity={0.85}\n            >\n              <Text style={styles.primaryLabel}>Create Schedule</Text>\n            </TouchableOpacity>\n\n            <TouchableOpacity\n              style={styles.secondaryButton}\n              onPress={() => router.push(ROUTES.LOCATION_ACCESS)}\n              activeOpacity={0.85}\n            >\n              <Text style={styles.secondaryLabel}>Open Location Dashboard</Text>\n            </TouchableOpacity>\n"
    )
write(home_path, home)

# 7) Add stack screen for location access
layout_path = "app/_layout.tsx"
layout = read(layout_path)
if "MapPin as MapPinIcon" not in layout:
    layout = layout.replace("  Handshake as HandshakeIcon,\n", "  Handshake as HandshakeIcon,\n  MapPin as MapPinIcon,\n")
if 'name="location-access"' not in layout:
    layout = layout.replace(
        "        {/* Dashboard / TV display uses its own full-screen layout */}\n        <Stack.Screen name=\"dashboard\" options={{ headerShown: false }} />\n",
        "        {/* Location PIN access */}\n        <Stack.Screen\n          name=\"location-access\"\n          options={{\n            headerTitle: () => (\n              <HeaderTitle\n                icon={<MapPinIcon size={24} color={WHITE} />}\n                label=\"Location Access\"\n              />\n            ),\n          }}\n        />\n\n        {/* Dashboard / TV display uses its own full-screen layout */}\n        <Stack.Screen name=\"dashboard\" options={{ headerShown: false }} />\n"
    )
write(layout_path, layout)

print("\nLocation PIN access update complete.")
