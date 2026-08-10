import React, { useState } from 'react';
import './index.css';

/**
 * List of Frequently Asked Questions and their corresponding answers.
 * Used to populate the FAQ accordion below the pricing section.
 */
const faqs = [
  {
    question: "What happens if I forget my master password?",
    answer: "Because of our strict zero-knowledge architecture, we do not store your master password and cannot recover it for you. It is critical that you remember it or write it down in a safe, physical location."
  },
  {
    question: "What does \"Zero-Knowledge\" actually mean?",
    answer: "It means your data is encrypted directly on your device before it is ever sent to our servers. We never hold the keys to decrypt your data, so even in the event of a server breach, your passwords remain completely unreadable and secure."
  },
  {
    question: "Can I use facial recognition on any device?",
    answer: "Facial recognition is an optional, secondary layer of convenience that processes biometric data entirely locally on your device. It requires a compatible camera and works strictly as an addition to your master password."
  },
  {
    question: "How does password sharing work?",
    answer: "When you share a password, it is securely encrypted using the recipient's public key. Only they can decrypt it with their private key, ensuring the password is never exposed in transit."
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
