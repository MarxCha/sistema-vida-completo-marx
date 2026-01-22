// src/hooks/useSubscription.ts
import { useState, useEffect, useCallback } from 'react';
import {
  paymentsApi,
  Subscription,
  SubscriptionPlan,
  Payment,
  PaymentMethod,
  FiscalData,
  Invoice,
} from '../services/api';

// Hook para obtener planes disponibles
export function usePlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.getPlans();
      if (response.success && response.data) {
        setPlans(response.data);
      }
    } catch (err) {
      setError('Error al cargar planes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, error, refresh: fetchPlans };
}

// Hook para gestionar la suscripción del usuario
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.getSubscription();
      if (response.success && response.data) {
        setSubscription(response.data);
      }
    } catch (err) {
      setError('Error al cargar suscripción');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const upgrade = useCallback(
    async (planId: string, billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY') => {
      try {
        setUpgrading(true);
        const response = await paymentsApi.upgradeSubscription(planId, billingCycle);
        if (response.success && response.data?.url) {
          // Redirigir a Stripe Checkout
          window.location.href = response.data.url;
        }
        return response;
      } catch (err) {
        console.error('Error upgrading:', err);
        throw err;
      } finally {
        setUpgrading(false);
      }
    },
    []
  );

  const cancel = useCallback(async (reason?: string, immediately = false) => {
    try {
      const response = await paymentsApi.cancelSubscription(reason, immediately);
      if (response.success && response.data) {
        setSubscription(response.data);
      }
      return response;
    } catch (err) {
      console.error('Error cancelling:', err);
      throw err;
    }
  }, []);

  const reactivate = useCallback(async () => {
    try {
      const response = await paymentsApi.reactivateSubscription();
      if (response.success && response.data) {
        setSubscription(response.data);
      }
      return response;
    } catch (err) {
      console.error('Error reactivating:', err);
      throw err;
    }
  }, []);

  const openBillingPortal = useCallback(async () => {
    try {
      const response = await paymentsApi.getBillingPortalUrl();
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Error opening billing portal:', err);
      throw err;
    }
  }, []);

  return {
    subscription,
    loading,
    error,
    upgrading,
    refresh: fetchSubscription,
    upgrade,
    cancel,
    reactivate,
    openBillingPortal,
  };
}

// Hook para el historial de pagos
export function usePaymentHistory(initialLimit = 10) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async (limit = initialLimit, offset = 0) => {
    try {
      setLoading(true);
      const response = await paymentsApi.getPaymentHistory(limit, offset);
      if (response.success) {
        // La API devuelve { data: [...], pagination: {...} }
        // No { data: { data: [...], pagination: {...} } }
        const paymentsData = Array.isArray(response.data) ? response.data : response.data?.data || [];
        const paginationData = response.pagination || response.data?.pagination;
        setPayments(paymentsData);
        setTotal(paginationData?.total || 0);
      }
    } catch (err) {
      setError('Error al cargar historial de pagos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [initialLimit]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { payments, total, loading, error, refresh: fetchPayments };
}

// Hook para métodos de pago
export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.getPaymentMethods();
      if (response.success && response.data) {
        setMethods(response.data);
      }
    } catch (err) {
      setError('Error al cargar métodos de pago');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const addMethod = useCallback(async (stripePaymentMethodId: string, setAsDefault = false) => {
    const response = await paymentsApi.savePaymentMethod(stripePaymentMethodId, setAsDefault);
    if (response.success) {
      await fetchMethods();
    }
    return response;
  }, [fetchMethods]);

  const removeMethod = useCallback(async (id: string) => {
    const response = await paymentsApi.deletePaymentMethod(id);
    if (response.success) {
      await fetchMethods();
    }
    return response;
  }, [fetchMethods]);

  const setDefault = useCallback(async (id: string) => {
    const response = await paymentsApi.setDefaultPaymentMethod(id);
    if (response.success) {
      await fetchMethods();
    }
    return response;
  }, [fetchMethods]);

  return {
    methods,
    loading,
    error,
    refresh: fetchMethods,
    addMethod,
    removeMethod,
    setDefault,
    defaultMethod: methods.find((m) => m.isDefault),
  };
}

// Hook para datos fiscales
export function useFiscalData() {
  const [fiscalData, setFiscalData] = useState<FiscalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchFiscalData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentsApi.getFiscalData();
      if (response.success) {
        setFiscalData(response.data ?? null);
      }
    } catch (err) {
      setError('Error al cargar datos fiscales');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiscalData();
  }, [fetchFiscalData]);

  const save = useCallback(async (data: Omit<FiscalData, 'id' | 'createdAt'>) => {
    try {
      setSaving(true);
      const response = await paymentsApi.saveFiscalData(data);
      if (response.success && response.data) {
        setFiscalData(response.data);
      }
      return response;
    } catch (err) {
      console.error('Error saving fiscal data:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { fiscalData, loading, error, saving, refresh: fetchFiscalData, save };
}

// Hook para facturas
export function useInvoices(initialLimit = 10) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (limit = initialLimit, offset = 0) => {
    try {
      setLoading(true);
      const response = await paymentsApi.getInvoices(limit, offset);
      if (response.success) {
        // La API devuelve { data: [...], pagination: {...} }
        const invoicesData = Array.isArray(response.data) ? response.data : response.data?.data || [];
        const paginationData = response.pagination || response.data?.pagination;
        setInvoices(invoicesData);
        setTotal(paginationData?.total || 0);
      }
    } catch (err) {
      setError('Error al cargar facturas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [initialLimit]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const generate = useCallback(async (paymentId: string) => {
    const response = await paymentsApi.generateInvoice(paymentId);
    if (response.success) {
      await fetchInvoices();
    }
    return response;
  }, [fetchInvoices]);

  const resend = useCallback(async (invoiceId: string) => {
    return await paymentsApi.resendInvoice(invoiceId);
  }, []);

  return { invoices, total, loading, error, refresh: fetchInvoices, generate, resend };
}
