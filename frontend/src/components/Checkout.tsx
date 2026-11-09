import { useEffect, useState } from 'react';
import type { Cart, Order } from '../checkoutTypes';
import { fetchCart, pay } from '../api';

export function Checkout() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCart().then(setCart).catch((e) => setError(String(e.message ?? e)));
  }, []);

  const handlePay = async () => {
    if (!cart) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await pay(cardNumber, cart.totalCents);
      setOrder(result);
    } catch (e: any) {
      setError(String(e.message ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart) {
    return <p data-testid="cart-loading">Loading cart...</p>;
  }

  if (order) {
    return (
      <section data-testid="order-confirmation">
        <h2>Order {order.status === 'APPROVED' ? 'confirmed' : 'declined'}</h2>
        <p data-testid="order-status">{order.status}</p>
        <p data-testid="order-id">Order #{order.id}</p>
        <p data-testid="order-card-last4">Card ending {order.cardLast4}</p>
      </section>
    );
  }

  return (
    <section data-testid="checkout-cart">
      <h2>Checkout</h2>
      <ul data-testid="cart-items">
        {cart.items.map((item) => (
          <li key={item.sku} data-testid={`cart-item-${item.sku}`}>
            {item.name} x{item.quantity}, ${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}
          </li>
        ))}
      </ul>
      <p data-testid="cart-total">Total: ${(cart.totalCents / 100).toFixed(2)}</p>

      <label htmlFor="card-number">Card number</label>
      <input
        id="card-number"
        data-testid="card-number-input"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
        maxLength={16}
      />
      <button data-testid="pay-button" disabled={submitting} onClick={handlePay}>
        Pay
      </button>

      {error ? <p data-testid="checkout-error">{error}</p> : null}
    </section>
  );
}
