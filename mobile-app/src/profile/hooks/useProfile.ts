import { useCallback, useEffect, useState } from 'react';
import {
    fetchMyProfile,
    setMyAvailability,
    updateMyProfile,
    uploadVerificationDocument,
    USE_MOCK,
} from '../services/profileService';
import { DonorProfile, EditableProfileFields, PickedFile } from '../types/profile';

export function useProfile(isAuthenticated: boolean = true) {
    const [profile, setProfile] = useState<DonorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        if (!isAuthenticated && !USE_MOCK) {
            setProfile(null);
            setLoading(false);
            setRefreshing(false);
            setError(null);
            return;
        }

        isRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        try {
            setProfile(await fetchMyProfile());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load your profile.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        load();
    }, [load]);

    // Optimistic update: flip the switch instantly, roll back if the server fails.
    const toggleAvailability = useCallback(
        async (value: boolean) => {
            if (!profile) return;
            const previous = profile;
            setProfile({ ...profile, isAvailable: value });
            try {
                setProfile(await setMyAvailability(value));
            } catch (e) {
                setProfile(previous);
                throw e;
            }
        },
        [profile],
    );

    const saveProfile = useCallback(async (fields: EditableProfileFields) => {
        setProfile(await updateMyProfile(fields));
    }, []);

    const uploadDocument = useCallback(async (file: PickedFile) => {
        setUploading(true);
        try {
            setProfile(await uploadVerificationDocument(file));
        } finally {
            setUploading(false);
        }
    }, []);

    return {
        profile,
        loading,
        refreshing,
        uploading,
        error,
        reload: () => load(false),
        refresh: () => load(true),
        toggleAvailability,
        saveProfile,
        uploadDocument,
    };
}

export type ProfileState = ReturnType<typeof useProfile>;
