// Test para verificar que el problema CSRF está solucionado
import axios from 'axios';

const API_BASE = 'https://api.vida.mdconsultoria-ti.org/api/v1';

async function testCSRFFix() {
  console.log('🔒 Probando solución CSRF para endpoint de perfil...');
  
  // Test PUT con Origin header simulando solicitud desde el frontend
  try {
    const response = await axios.put(`${API_BASE}/profile`, {
      bloodType: 'A+',
      medications: ['Test medication after CSRF fix']
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3QtdXNlckBlbWFpbC5jb20iLCJpYXQiOjE3MzA1NjE2MDksImV4cCI6MTczMDU2MTY2OSwiaWF0IjoxNzMwNTYxNjA5fQ.test',
        'Origin': 'https://vida.mdconsultoria-ti.org',
        'Referer': 'https://vida.mdconsultoria-ti.org/'
      }
    });
    
    console.log('✅ PUT /api/v1/profile: ÉXITO');
    console.log('📊 Response:', response.data);
    
    if (response.data.success) {
      console.log('🎉 PROBLEMA CSRF SOLUCIONADO');
      console.log('💡 El endpoint ahora acepta solicitudes con Origin correcto');
    } else {
      console.log('❌ Respuesta con error:', response.data);
    }
    
  } catch (error: any) {
    console.log('❌ Error en prueba CSRF:', error.response?.status);
    console.log('💬 Detalles:', error.response?.data);
    
    if (error.response?.status === 403) {
      if (error.response.data?.error?.code === 'CSRF_VALIDATION_FAILED') {
        console.log('⚠️ El problema CSRF persiste');
        console.log('💡 Verificar que el Origin sea correcto y esté en la lista de permitidos');
      } else {
        console.log('🔄 Error 403 pero por CSRF, puede ser otro problema');
      }
    } else if (error.response?.status === 401) {
      console.log('🔐 Error 401: Autenticación (normal para token inválido)');
    } else if (error.response?.status === 400) {
      console.log('📝 Error 400: Validación de datos (campo medications corregido)');
    } else {
      console.log('🌐 Error de red o servidor:', error.message);
    }
  }
}

testCSRFFix().catch(console.error);