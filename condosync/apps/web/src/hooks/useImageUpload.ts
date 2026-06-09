import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

// Upload User Avatar
export function useUploadUserAvatar(userId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/users/${userId}/avatar`, formData);
      return response.data;
    },
  });
}

// Upload Service Provider Photo
export function useUploadServiceProviderPhoto(providerId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/service-providers/${providerId}/photo`, formData);
      return response.data;
    },
  });
}

// Upload Vehicle Photo
export function useUploadVehiclePhoto(vehicleId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/vehicles/${vehicleId}/photo`, formData);
      return response.data;
    },
  });
}

// Delete User Avatar
export function useDeleteUserAvatar(userId: string) {
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/users/${userId}/avatar`);
    },
  });
}

// Delete Service Provider Photo
export function useDeleteServiceProviderPhoto(providerId: string) {
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/service-providers/${providerId}/photo`);
    },
  });
}

// Delete Vehicle Photo
export function useDeleteVehiclePhoto(vehicleId: string) {
  return useMutation({
    mutationFn: async () => {
      await api.delete(`/vehicles/${vehicleId}/photo`);
    },
  });
}

// Helper to get image URL for avatar
export function getUserAvatarUrl(avatarPath?: string | null): string {
  if (!avatarPath) return '';
  return `/api/v1/users/${avatarPath.split('/')[1]}/avatar/file`;
}

// Helper to get image URL for service provider photo
export function getServiceProviderPhotoUrl(photoPath?: string | null): string {
  if (!photoPath) return '';
  return `/api/v1/service-providers/${photoPath.split('/')[1]}/photo/file`;
}

// Helper to get image URL for vehicle photo
export function getVehiclePhotoUrl(photoPath?: string | null): string {
  if (!photoPath) return '';
  return `/api/v1/vehicles/${photoPath.split('/')[1]}/photo/file`;
}

// Helper to normalize photo path
export function normalizePhotoPath(path: string | null | undefined): string | undefined {
  return path || undefined;
}
