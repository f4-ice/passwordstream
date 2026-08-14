import { useState } from 'react';
import './index.css';

const notices = {
  en: {
    title: 'Security and Data Notice',
    description: 'This presentation-only page summarizes behavior visible in the PasswordStream source code. It is not a Privacy Policy, Terms of Service, legal notice, certification, legal opinion, or claim of regulatory compliance.',
    items: [
      {
        name: 'Data processed by the service',
        scope: 'Account and encrypted application data.',
        detail: 'When the prototype is run, the server stores email addresses, bcrypt hashes of password-derived authentication keys, public sharing keys, master-key-encrypted private sharing keys, encrypted credential items, and encrypted shares.'
      },
      {
        name: 'Client-side encryption',
        scope: 'Protection against passive disclosure of stored vault data.',
        detail: 'The intended frontend derives keys with PBKDF2 and encrypts each credential separately with AES-GCM before upload. This protection assumes a strong master password and an authentic, unmodified frontend.'
      },
      {
        name: 'Threat-model limits',
        scope: 'Active server, frontend, dependency, and device compromise.',
        detail: 'An attacker able to modify delivered JavaScript, browser dependencies, or the device can capture the master password, cryptographic keys, or decrypted data. Client-side encryption does not protect those scenarios.'
      },
      {
        name: 'Sharing and identity',
        scope: 'Hybrid encryption and public-key verification.',
        detail: 'Shares use AES-256-GCM with RSA-OAEP key wrapping and ECDSA signatures. The server distributes public keys. Fingerprint pinning can detect later key changes in the same browser, but first-use fingerprints must be verified out of band.'
      },
      {
        name: 'Compliance status',
        scope: 'No certification or legal conclusion.',
        detail: 'The repository has not established GDPR, Costa Rican privacy-law, ISO, NIST, or other regulatory compliance. A real deployment requires legal review, governance, retention procedures, incident response, accessibility work, and an independent security assessment.'
      }
    ]
  },
  es: {
    title: 'Aviso de Seguridad y Datos',
    description: 'Esta página, creada únicamente para la presentación del proyecto, resume el comportamiento visible en el código fuente de PasswordStream. No es una Política de Privacidad, Términos de Servicio, aviso legal, certificación, asesoría legal ni declaración de cumplimiento normativo.',
    items: [
      {
        name: 'Datos procesados por el servicio',
        scope: 'Cuenta y datos cifrados de la aplicación.',
        detail: 'Cuando se ejecuta el prototipo, el servidor almacena correos electrónicos, hashes bcrypt de claves de autenticación derivadas, claves públicas, claves privadas de compartición cifradas con la clave maestra, credenciales cifradas y comparticiones cifradas.'
      },
      {
        name: 'Cifrado en el cliente',
        scope: 'Protección ante la divulgación pasiva de datos almacenados.',
        detail: 'El frontend previsto deriva claves con PBKDF2 y cifra cada credencial por separado con AES-GCM antes de subirla. Esta protección presupone una contraseña maestra robusta y un frontend auténtico y sin modificaciones.'
      },
      {
        name: 'Límites del modelo de amenazas',
        scope: 'Compromiso activo del servidor, frontend, dependencias o dispositivo.',
        detail: 'Quien pueda modificar el JavaScript entregado, las dependencias o el dispositivo puede capturar la contraseña maestra, las claves o los datos descifrados. El cifrado en el cliente no protege esos escenarios.'
      },
      {
        name: 'Compartición e identidad',
        scope: 'Cifrado híbrido y verificación de claves públicas.',
        detail: 'Las comparticiones usan AES-256-GCM, envoltura RSA-OAEP y firmas ECDSA. El servidor distribuye las claves públicas. El pinning detecta cambios posteriores en el mismo navegador, pero la primera huella debe verificarse por otro canal.'
      },
      {
        name: 'Estado de cumplimiento',
        scope: 'Sin certificación ni conclusión legal.',
        detail: 'El repositorio no ha demostrado cumplimiento con GDPR, legislación costarricense, ISO, NIST u otros marcos. Un despliegue real requiere revisión legal, gobierno de datos, políticas de retención, respuesta a incidentes y una evaluación de seguridad independiente.'
      }
    ]
  }
};

const Legal = () => {
  const [lang, setLang] = useState('en');
  const data = notices[lang];

  return (
    <div className="legal-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <div className="lang-switcher">
          <label>Language / Idioma: </label>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>
      <div className="legal-header"><h1>{data.title}</h1></div>
      <p className="legal-intro">{data.description}</p>
      <div className="laws-grid">
        {data.items.map(item => (
          <div key={item.name} className="law-card">
            <h2>{item.name}</h2>
            <div className="law-section">
              <strong>{lang === 'en' ? 'Scope:' : 'Ámbito:'}</strong>
              <p>{item.scope}</p>
            </div>
            <div className="law-section">
              <strong>{lang === 'en' ? 'Current behavior:' : 'Comportamiento actual:'}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Legal;
