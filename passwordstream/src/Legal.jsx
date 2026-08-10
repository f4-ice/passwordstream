import React, { useState } from 'react';
import './index.css';

/**
 * Legal Content Dictionary
 * Stores the bilingual text (English and Spanish) for the application's compliance and legal framework.
 * Explains how the Zero-Knowledge architecture adheres to global privacy laws like GDPR and CCPA.
 */
const legalData = {
  en: {
    title: "Legal and Regulatory Framework",
    description: "The following laws and regulations guide our data privacy and security practices. Here is how PasswordStream complies with them, especially concerning our zero-knowledge architecture and optional facial recognition.",
    laws: [
      {
        id: 1,
        name: "Law 8968 (Protection of Personal Data, Costa Rica)",
        scope: "Protection of personal data, supervised by PRODHAB.",
        compliance: "We protect all personal data and metadata using zero-knowledge encryption. Activating optional facial recognition requires explicit and separate consent. Biometric data is never processed or stored as raw images."
      },
      {
        id: 2,
        name: "Regulation to Law 8968",
        scope: "Operational procedures and obligations developed by PRODHAB.",
        compliance: "Applied to our user registration and facial biometrics, we ensure secure local retention and verifiable deletion of the biometric template under our strict zero-knowledge model."
      },
      {
        id: 3,
        name: "GDPR — Regulation (EU) 2016/679",
        scope: "Protection of personal data for residents of the European Union.",
        compliance: "Facial recognition is classified as a special category of data under GDPR. Our zero-knowledge model inherently supports privacy by design and data minimization. We obtain explicit consent before any biometric processing."
      },
      {
        id: 4,
        name: "ISO/IEC 27001:2022",
        scope: "Information Security Management System (ISMS).",
        compliance: "Our system employs strong cryptography (PBKDF2 with 600,000 iterations, bcrypt, AES-GCM, RSA-OAEP, and ECDSA) to rigorously protect password vaults and secure our database infrastructure against incidents."
      },
      {
        id: 5,
        name: "ISO/IEC 27701:2025",
        scope: "Privacy Information Management System (PIMS).",
        compliance: "We maintain absolute transparency regarding any Personally Identifiable Information (PII) we process. Responsibility and retention roles are strictly defined, particularly regarding our password sharing features."
      },
      {
        id: 6,
        name: "ISO/IEC 30107-3",
        scope: "Detection of presentation attacks in biometric systems (anti-spoofing).",
        compliance: "Our optional facial recognition is designed with security in mind. We acknowledge the standard's recommendations regarding liveness detection and explicitly advise users that it is a secondary, convenience-based authentication layer."
      },
      {
        id: 7,
        name: "NIST SP 800-63B",
        scope: "Digital Identity Guidelines: Authentication and Lifecycle Management.",
        compliance: "The master password serves as your primary authentication factor. Biometrics is offered solely as an optional, complementary multifactor approach, aligning perfectly with NIST's recommendations."
      },
      {
        id: 8,
        name: "NIST CSF 2.0",
        scope: "Cybersecurity Framework for Risk Management.",
        compliance: "We continuously map our cryptographic controls and database protections against the framework's core functions to identify, protect, detect, respond, and recover from potential cybersecurity incidents."
      }
    ]
  },
  es: {
    title: "Marco Legal y Normativo",
    description: "Las siguientes leyes y normativas guían nuestras prácticas de privacidad y seguridad de datos. Así es como PasswordStream cumple con ellas, especialmente en relación con nuestra arquitectura zero-knowledge y el reconocimiento facial opcional.",
    laws: [
      {
        id: 1,
        name: "Ley 8968 (Protección de la Persona frente al Tratamiento de sus Datos Personales, Costa Rica)",
        scope: "Protección de datos personales, con supervisión de PRODHAB.",
        compliance: "Protegemos todos los datos personales y metadatos utilizando cifrado zero-knowledge. La activación del reconocimiento facial opcional requiere un consentimiento explícito y separado. Los datos biométricos nunca se procesan ni almacenan como imágenes crudas."
      },
      {
        id: 2,
        name: "Reglamento a la Ley 8968",
        scope: "Procedimientos operativos y obligaciones desarrolladas por PRODHAB.",
        compliance: "Aplicado a nuestro registro de usuarios y biometría facial, garantizamos la retención local segura y la eliminación verificable de la plantilla biométrica bajo nuestro estricto modelo zero-knowledge."
      },
      {
        id: 3,
        name: "GDPR — Reglamento (UE) 2016/679",
        scope: "Protección de datos personales de residentes de la Unión Europea.",
        compliance: "El reconocimiento facial se clasifica como una categoría especial de datos bajo el GDPR. Nuestro modelo zero-knowledge apoya intrínsecamente la privacidad desde el diseño y la minimización de datos. Obtenemos consentimiento explícito antes de cualquier procesamiento biométrico."
      },
      {
        id: 4,
        name: "ISO/IEC 27001:2022",
        scope: "Sistema de gestión de seguridad de la información (SGSI).",
        compliance: "Nuestro sistema emplea criptografía robusta (PBKDF2 con 600,000 iteraciones, bcrypt, AES-GCM, RSA-OAEP y ECDSA) para proteger rigurosamente las bóvedas de contraseñas y asegurar nuestra infraestructura de base de datos contra incidentes."
      },
      {
        id: 5,
        name: "ISO/IEC 27701:2025",
        scope: "Sistema de gestión de privacidad (PIMS).",
        compliance: "Mantenemos absoluta transparencia respecto a cualquier Información de Identificación Personal (PII) que procesamos. Los roles de responsabilidad y retención están estrictamente definidos, particularmente en nuestras funciones de compartición de contraseñas."
      },
      {
        id: 6,
        name: "ISO/IEC 30107-3",
        scope: "Detección de ataques de presentación en sistemas biométricos (anti-spoofing).",
        compliance: "Nuestro reconocimiento facial opcional está diseñado pensando en la seguridad. Reconocemos las recomendaciones del estándar sobre la detección de vida y advertimos explícitamente a los usuarios que es una capa de autenticación secundaria basada en la conveniencia."
      },
      {
        id: 7,
        name: "NIST SP 800-63B",
        scope: "Guía de autenticación digital.",
        compliance: "La contraseña maestra sirve como su factor de autenticación principal. La biometría se ofrece únicamente como un enfoque multifactor opcional y complementario, alineándose perfectamente con las recomendaciones del NIST."
      },
      {
        id: 8,
        name: "NIST CSF 2.0",
        scope: "Marco de gestión de riesgo de ciberseguridad.",
        compliance: "Mapeamos continuamente nuestros controles criptográficos y protecciones de base de datos contra las funciones principales del marco para identificar, proteger, detectar, responder y recuperarnos de posibles incidentes de ciberseguridad."
      }
    ]
  }
};

/**
 * Legal Component
 * 
 * Renders the bilingual legal compliance page.
 * Allows users to toggle between English and Spanish using a language selector dropdown.
 */
const Legal = () => {
  // State to manage the currently selected language ('en' for English, 'es' for Spanish)
  const [lang, setLang] = useState('en');

  // Derive the localized content based on the active language state
  const data = legalData[lang];

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
      <div className="legal-header">
        <h1>{data.title}</h1>
      </div>
      
      <p className="legal-intro">{data.description}</p>

      <div className="laws-grid">
        {data.laws.map(law => (
          <div key={law.id} className="law-card">
            <h2>{law.name}</h2>
            <div className="law-section">
              <strong>{lang === 'en' ? 'Scope:' : 'Ámbito:'}</strong>
              <p>{law.scope}</p>
            </div>
            <div className="law-section">
              <strong>{lang === 'en' ? 'Compliance:' : 'Cumplimiento:'}</strong>
              <p>{law.compliance}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Legal;
