import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMsalInstance, loginRequest, managementRequest } from '../authConfig';

const AuthContext = createContext(null);

const MSA_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

function isPersonalAccount(acct) {
  if (!acct) return false;
  const tid = acct.tenantId || acct.idTokenClaims?.tid;
  return tid === MSA_TENANT_ID;
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msalReady, setMsalReady] = useState(false);
  const [hasManagementAccess, setHasManagementAccess] = useState(false);

  // Initialize MSAL on mount
  useEffect(() => {
    let cancelled = false;
    getMsalInstance()
      .then((instance) => {
        if (cancelled) return;
        if (instance) {
          setMsalReady(true);
          const accounts = instance.getAllAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            // Check if we already have management access cached
            if (!isPersonalAccount(accounts[0])) {
              instance.acquireTokenSilent({
                ...managementRequest,
                account: accounts[0],
              }).then(() => setHasManagementAccess(true))
                .catch(() => {});
            }
          }
        }
      })
      .catch((err) => {
        console.warn('MSAL init failed:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async () => {
    const instance = await getMsalInstance();
    if (!instance) throw new Error('Azure AD is not configured');
    const result = await instance.loginPopup(loginRequest);
    setAccount(result.account);

    // Only try management token for organizational accounts
    if (!isPersonalAccount(result.account)) {
      try {
        await instance.acquireTokenPopup(managementRequest);
        setHasManagementAccess(true);
      } catch {
        // Org account but no Azure access
      }
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    const instance = await getMsalInstance();
    if (instance) {
      await instance.logoutPopup();
    }
    setAccount(null);
  }, []);

  const getAccessToken = useCallback(async () => {
    const instance = await getMsalInstance();
    if (!instance || !account) return null;
    try {
      const resp = await instance.acquireTokenSilent({
        ...managementRequest,
        account,
      });
      return resp.accessToken;
    } catch {
      const resp = await instance.acquireTokenPopup(managementRequest);
      setAccount(resp.account);
      return resp.accessToken;
    }
  }, [account]);

  return (
    <AuthContext.Provider
      value={{
        account,
        isAuthenticated: Boolean(account),
        isPersonal: isPersonalAccount(account),
        hasManagementAccess,
        loading,
        msalReady,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
