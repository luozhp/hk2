import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api';

const TOKEN_KEY = 'hunter_token';
const USER_KEY = 'hunter_user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'sales';
  status?: string;
}

export const ROLE_LABEL: Record<string, string> = {
  admin: '管理者',
  operator: '运营专员',
  sales: '业务员',
};

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '');
  const user = ref<AuthUser | null>(null);
  try {
    user.value = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    user.value = null;
  }

  async function login(email: string, password: string) {
    const res = await api.auth.login(email, password);
    token.value = res.token;
    user.value = res.user;
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      const me = await api.auth.me();
      user.value = me;
      localStorage.setItem(USER_KEY, JSON.stringify(me));
      return me;
    } catch {
      logout();
      return null;
    }
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return { token, user, login, fetchMe, logout };
});
