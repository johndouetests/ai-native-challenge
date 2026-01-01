export interface RiskCheckInput {
  userId: string;
  action: 'redeem' | 'transfer';
  reference: string;
}

/**
 * Stand-in for the external anti-fraud service. It always approves,
 * but like the real service it responds after 20-80 ms.
 */
export async function riskCheck(_input: RiskCheckInput): Promise<void> {
  const delayMs = 20 + Math.floor(Math.random() * 61);
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
