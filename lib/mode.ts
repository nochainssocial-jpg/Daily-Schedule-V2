// lib/mode.ts
import { useLocalSearchParams } from 'expo-router';
export type EditorMode = 'create' | 'edit';
export function useEditorMode(defaultMode: EditorMode = 'edit'): EditorMode {
  const params = useLocalSearchParams<{ mode?: string }>();
  const m = (params?.mode || '').toLowerCase();
  return (m === 'create' || m === 'edit') ? (m as EditorMode) : defaultMode;
}
