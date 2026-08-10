import React, { useState } from 'react';
import './index.css';

/**
 * Checkout Component
 * 
 * Renders a placeholder secure checkout flow when a user selects a plan.
 * Simulates a payment processing delay and displays a success confirmation.
 * 
 * @param {Object} props
 * @param {Object} props.selectedPlan - The subscription plan the user chose (e.g., { name: 'Basic', price: '10$/m' }).
 * @param {Function} props.setCurrentPage - Function to route the user after successful payment or cancellation.
 */
const Checkout = ({ selectedPlan, setCurrentPage }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Ensure we have a fallback plan if the user lands here directly without selecting one
  const plan = selectedPlan || { name: 'Basic', price: '10$/m' };

  /**
   * handleCheckout
   * Prevents default form submission, sets processing state to simulate a network request,
   * and triggers the success view after a 2-second delay.
   */
  const handleCheckout = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
    }, 2000); // Simulate network request
  };

  if (success) {
    return (
      <div className="checkout-container success-container">
        <div className="success-icon">✓</div>
        <h2>Payment Successful!</h2>
        <p>Your {plan.name} plan is now active.</p>
        <button className="primary-btn" onClick={() => setCurrentPage('signup')}>
          Proceed to Account Creation
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="demo-warning" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #fcd34d', fontWeight: '500', textAlign: 'center', lineHeight: '1.5' }}>
        This is just a placeholder! None of it is real! Your info won't be stored because there is no actual payment mechanism implemented in the site yet! This is just for demonstration purposes.
      </div>
      <div className="checkout-header">
        <h2>Secure Checkout</h2>
        <p>Complete your subscription for the <strong>{plan.name}</strong> plan.</p>
      </div>

      <div className="checkout-content">
        <div className="order-summary">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>{plan.name} Plan (Monthly)</span>
            <span>{plan.price}</span>
          </div>
          <div className="summary-row total-row">
            <span>Total Due Today</span>
            <span>{plan.price}</span>
          </div>
        </div>

        <form className="checkout-form" onSubmit={handleCheckout}>
          <h3>Payment Details</h3>
          <div className="form-group">
            <label>Cardholder Name</label>
            <input type="text" placeholder="Name on card" required />
          </div>
          <div className="form-group">
            <label>Card Number</label>
            <input type="text" placeholder="0000 0000 0000 0000" maxLength="19" required />
          </div>
          <div className="form-row">
            <div className="form-group half">
              <label>Expiry Date</label>
              <input type="text" placeholder="MM/YY" maxLength="5" required />
            </div>
            <div className="form-group half">
              <label>CVC</label>
              <input type="text" placeholder="123" maxLength="4" required />
            </div>
          </div>
          <button 
            type="submit" 
            className="primary-btn checkout-btn" 
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : `Pay ${plan.price}`}
          </button>
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={() => setCurrentPage('landing')}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
