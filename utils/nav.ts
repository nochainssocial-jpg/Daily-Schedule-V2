import { router } from 'expo-router';
import { ROUTES } from '@/constants/ROUTES';

export const goHome = () => router.replace(ROUTES.HOME);
export const goCreate = () => router.push(ROUTES.CREATE);
export const goEdit = () => router.replace(ROUTES.EDIT);
export const goShare = () => router.push(ROUTES.SHARE);
export const goEditCategory = (c: string) => router.push(ROUTES.EDIT_CATEGORY(c));
