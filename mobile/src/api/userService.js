import api from "./api";

export const updateProfileImageApi = async (userId, profileImage) => {
  const response = await api.put(`/users/${userId}/profile-image`, { profileImage });
  return response.data;
};
