import crypto from 'crypto';

/**
 * Generate a signature for verifying Razorpay payments on the frontend
 * This is useful for frontend callback verification
 *
 * @param orderCreationResponse The response from Razorpay order creation
 * @param paymentId The payment ID received from Razorpay after payment
 * @param signature The signature received from Razorpay after payment
 * @returns boolean indicating if the payment signature is valid
 */
export const verifyPaymentSignature = (
  orderCreationResponse: any,
  paymentId: string,
  signature: string,
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderCreationResponse.id}|${paymentId}`)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Format amount from currency unit (dollars, rupees) to subunits (cents, paise)
 * Razorpay requires amounts in the smallest currency unit
 *
 * @param amount The amount in currency units (e.g., 100.50 rupees)
 * @returns The amount in subunits (e.g., 10050 paise)
 */
export const formatAmountForRazorpay = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Format amount from subunits back to currency units
 *
 * @param amount The amount in subunits (e.g., 10050 paise)
 * @returns The amount in currency units (e.g., 100.50 rupees)
 */
export const formatAmountFromRazorpay = (amount: number): number => {
  return amount / 100;
};
