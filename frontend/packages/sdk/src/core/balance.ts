import {
  setOnUTXOMerkletreeScanCallback,
  setOnTXIDMerkletreeScanCallback,
  setOnBalanceUpdateCallback,
} from "@railgun-community/wallet";
import {
  MerkletreeScanUpdateEvent,
  RailgunBalancesEvent,
} from "@railgun-community/shared-models";

/**
 * Setup balance listeners
 * @param onScanUpdate - Callback for scan progress (0.0 ~ 1.0)
 * @param onBalanceUpdate - Callback for balance updates
 */
export const setupBalanceListeners = (
  onScanUpdate: (progress: number) => void,
  onBalanceUpdate: (balanceEvent: RailgunBalancesEvent) => void
) => {
  const utxoListener = (event: MerkletreeScanUpdateEvent) => {
    onScanUpdate(event.progress);
  };
  setOnUTXOMerkletreeScanCallback(utxoListener);

  const txidListener = (event: MerkletreeScanUpdateEvent) => {
    onScanUpdate(event.progress);
  };
  setOnTXIDMerkletreeScanCallback(txidListener);

  const balanceListener = (balanceEvent: RailgunBalancesEvent) => {
    onBalanceUpdate(balanceEvent);
  };
  setOnBalanceUpdateCallback(balanceListener);

  return () => {
    setOnUTXOMerkletreeScanCallback(() => { });
    setOnTXIDMerkletreeScanCallback(() => { });
    setOnBalanceUpdateCallback(() => { });
  };
};
