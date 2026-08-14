import { useState } from 'react';
import './index.css';

/**
 * List of Frequently Asked Questions and their corresponding answers.
 * Used to populate the FAQ accordion below the pricing section.
 */
const faqs = [
  {
    question: "What happens if I forget my master password?",
    answer: "PasswordStream has no recovery mechanism. The intended client does not send the raw master password, so losing it makes the encrypted vault and private sharing keys unavailable."
  },
  {
    question: "What does client-side encryption protect?",
    answer: "It helps protect vault contents if an attacker obtains a passive copy of the database, assuming a strong master password and the original frontend. It does not protect against modified JavaScript, a compromised device, or data captured while decrypted."
  },
  {
    question: "Does PasswordStream use biometrics?",
    answer: "No. Facial recognition and stored face descriptors were removed. PasswordStream currently authenticates with the password-derived authentication key only."
  },
  {
    question: "How does password sharing work?",
    answer: "The browser encrypts the payload with a random AES-GCM key and wraps that key with the recipient's RSA public key. Verify the displayed fingerprint out of band: the server distributes public keys and could substitute one if compromised."
  }
];

/**
 * FAQ Component
 * 
 * Renders an interactive accordion of Frequently Asked Questions.
 * Only one question can be open at a time, or all can be closed.
 */
const FAQ = () => {
  // State to track which FAQ item is currently expanded. Null means all are closed.
  const [openIndex, setOpenIndex] = useState(null);

  /**
   * toggleFAQ
   * Toggles the open/closed state of an FAQ item.
   * If the clicked item is already open, it closes it. Otherwise, it opens the clicked item.
   * 
   * @param {number} index - The array index of the FAQ item being toggled.
   */
  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section">
      <div className="faq-container">
        <h2 className="faq-title">Frequently Asked Questions</h2>
        <p className="faq-subtitle">Everything you need to know about PasswordStream and how we keep your data safe.</p>
        
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`faq-item ${isOpen ? 'open' : ''}`}
                onClick={() => toggleFAQ(index)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <span className="faq-icon">{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
