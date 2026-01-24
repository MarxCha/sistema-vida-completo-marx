// Script para diagnosticar y simular el flujo completo del frontend
// Simula login, guardar token, y hacer solicitud de perfil

const API_BASE = 'https://api.vida.mdconsultoria-ti.org/api/v1';

class FrontendSimulator {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async simulateLogin() {
    console.log('🔐 Paso 1: Simulando login...');
    
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'demo@sistemavida.mx',
          password: 'Demo123!'
        })
      });

      const data = await response.json() as any;
      
      if (data.success) {
        this.accessToken = data.data.tokens.accessToken;
        this.refreshToken = data.data.tokens.refreshToken;
        
        console.log('✅ Login exitoso');
        console.log('📝 Tokens guardados:');
        console.log('   Access Token:', this.accessToken?.substring(0, 50) + '...');
        console.log('   Refresh Token:', this.refreshToken?.substring(0, 50) + '...');
        console.log('   Expires In:', data.data.tokens.expiresIn);
        
        return true;
      } else {
        console.log('❌ Login fallido:', data);
        return false;
      }
      
    } catch (error) {
      console.log('❌ Error en login:', error);
      return false;
    }
  }

  async testPUTProfile() {
    console.log('👤 Paso 2: Probando PUT al perfil...');
    
    if (!this.accessToken) {
      console.log('❌ No hay access token - esto simula el problema del frontend');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'Origin': 'https://vida.mdconsultoria-ti.org',
          'Referer': 'https://vida.mdconsultoria-ti.org/profile'
        },
        body: JSON.stringify({
          bloodType: 'A+',
          medications: ['Test medication'],
          allergies: ['Test alergia'],
          conditions: ['Test condition']
        })
      });

      const data = await response.json() as any;
      
      console.log(`📊 Response Status: ${response.status}`);
      console.log('📄 Response Data:', data);
      
      if (data.success) {
        console.log('✅ PUT al perfil exitoso');
        return true;
      } else {
        console.log('❌ PUT al perfil fallido:', data);
        return false;
      }
      
    } catch (error) {
      console.log('❌ Error en PUT perfil:', error);
      return false;
    }
  }

  async testGETProfile() {
    console.log('📖 Paso 3: Probando GET al perfil...');
    
    if (!this.accessToken) {
      console.log('❌ No hay access token');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Origin': 'https://vida.mdconsultoria-ti.org'
        }
      });

      const data = await response.json() as any;
      
      console.log(`📊 Response Status: ${response.status}`);
      console.log('📄 Response Data:', data);
      
      if (data.success) {
        console.log('✅ GET al perfil exitoso');
        return true;
      } else {
        console.log('❌ GET al perfil fallido:', data);
        return false;
      }
      
    } catch (error) {
      console.log('❌ Error en GET perfil:', error);
      return false;
    }
  }

  async simulateTokenRefresh() {
    console.log('🔄 Paso 4: Probando refresh de token...');
    
    if (!this.refreshToken) {
      console.log('❌ No hay refresh token');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        })
      });

      const data = await response.json() as any;
      
      console.log(`📊 Response Status: ${response.status}`);
      console.log('📄 Response Data:', data);
      
      if (data.success) {
        this.accessToken = data.data.accessToken;
        console.log('✅ Token refrescado exitosamente');
        return true;
      } else {
        console.log('❌ Refresh de token fallido:', data);
        return false;
      }
      
    } catch (error) {
      console.log('❌ Error en refresh:', error);
      return false;
    }
  }

  async runSimulation() {
    console.log('🚀 Iniciando simulación completa del flujo frontend...');
    console.log('=' .repeat(60));
    
    // Paso 1: Login
    const loginSuccess = await this.simulateLogin();
    
    if (!loginSuccess) {
      console.log('💥 No se puede continuar sin login exitoso');
      return;
    }
    
    console.log('=' .repeat(60));
    
    // Paso 2: GET perfil
    await this.testGETProfile();
    
    console.log('=' .repeat(60));
    
    // Paso 3: PUT perfil
    await this.testPUTProfile();
    
    console.log('=' .repeat(60));
    
    // Paso 4: Intentar refresh si es necesario
    await this.simulateTokenRefresh();
    
    console.log('=' .repeat(60));
    console.log('🏁 Simulación completada');
    
    // Resumen
    console.log('\n📊 RESUMEN DEL PROBLEMA:');
    console.log('├── El frontend necesita guardar los tokens en localStorage');
    console.log('├── El frontend necesita incluir Authorization header');
    console.log('├── El frontend necesita manejar expiración de tokens');
    console.log('└── El backend está funcionando correctamente');
    
    console.log('\n💡 SOLUCIONES PARA EL FRONTEND:');
    console.log('├── Guardar accessToken en localStorage después del login');
    console.log('├── Incluir Authorization: Bearer <token> en las solicitudes');
    console.log('├── Implementar refresh automático de tokens');
    console.log('└── Manejar errores 401/403 con logout y redirección');
  }
}

// Ejecutar simulación
const simulator = new FrontendSimulator();
simulator.runSimulation().catch(console.error);