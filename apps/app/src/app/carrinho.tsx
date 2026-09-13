import { CartScreen } from '@/screens/cart-screen';

/**
 * Public on purpose: an anonymous visitor can see what they picked. The quote
 * and the order need a session, and the screen says so instead of redirecting —
 * being bounced to a login form from a page you were reading is how a cart gets
 * abandoned.
 */
export default CartScreen;
