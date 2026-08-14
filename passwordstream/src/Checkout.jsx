import { useState } from 'react';
import './index.css';

const Checkout = ({ selectedPlan, setCurrentPage }) => {
  const [complete, setComplete] = useState(false);
  const plan = selectedPlan || { name: 'Basic', price: '$2/year' };

  if (complete) {
    return (
      <div className="checkout-container success-container">
        <div className="success-icon">✓</div>
        <h2>Checkout demonstration complete</h2>
        <p>No payment was processed and no subscription was created.</p>
        <button className="primary-btn" onClick={() => setCurrentPage('signup')}>
          Continue to account creation
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="demo-warning" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #fcd34d', fontWeight: '500', textAlign: 'center', lineHeight: '1.5' }}>
        Presentation-only checkout. Prices and plans are fictional. No payment details are requested, stored, or processed.
      </div>
      <div className="checkout-header">
        <h2>Checkout Preview</h2>
        <p>Illustrative subscription flow for the <strong>{plan.name}</strong> plan.</p>
      </div>
      <div className="checkout-content">
        <div className="order-summary">
          <h3>Illustrative Order Summary</h3>
          <div className="summary-row">
            <span>{plan.name} Plan</span>
            <span>{plan.price}</span>
          </div>
          <div className="summary-row total-row">
            <span>Displayed total</span>
            <span>{plan.price}</span>
          </div>
        </div>
        <div className="checkout-form">
          <h3>Payment integration placeholder</h3>
          <p>This prototype does not connect to a payment provider or create subscriptions.</p>
          <button type="button" className="primary-btn checkout-btn" onClick={() => setComplete(true)}>
            Simulate checkout
          </button>
          <button type="button" className="cancel-btn" onClick={() => setCurrentPage('landing')}>
            Back to homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
