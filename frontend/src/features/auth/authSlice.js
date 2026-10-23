import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { getDemoUser } from "../../utils/demoData";

const MOCK = import.meta.env.VITE_MOCK_AUTH === "true";

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password, role, school }, { rejectWithValue }) => {
    try {
      // Demo mode: sign in as a sample person of that role (and school) before the backend exists
      if (MOCK) {
        return { user: getDemoUser(role, school || "ENG"), accessToken: "mock-token" };
      }
      // Real mode: only email + password are sent. The server decides the role.
      const { data } = await api.post("/auth/login", { email, password });
      return data.data; // expects { user, accessToken }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: readStoredUser(),
    status: "idle", // idle | loading | failed
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
    },
    // Fresh details of the signed-in person from the server (role or school may have changed)
    setUser: (state, { payload }) => {
      state.user = payload;
      localStorage.setItem("user", JSON.stringify(payload));
    },
    clearAuthError: (state) => {
      state.error = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.status = "idle";
        state.user = payload.user;
        localStorage.setItem("user", JSON.stringify(payload.user));
        localStorage.setItem("accessToken", payload.accessToken);
      })
      .addCase(login.rejected, (state, { payload }) => {
        state.status = "failed";
        state.error = payload;
      });
  },
});

export const { logout, clearAuthError, setUser } = authSlice.actions;
export default authSlice.reducer;
