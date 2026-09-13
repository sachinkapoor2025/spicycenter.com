import type {
  Address,
  AddressValidationResult,
  LabelResult,
  PackageDetails,
  RateQuote,
  TrackingStatus,
} from "@spicycorner/shared";

export interface BuyLabelParams {
  rateId?: string;
  mailClass?: string;
  pkg: PackageDetails;
  origin: Address;
  destination: Address;
  orderId?: string;
}

export interface ShippingProvider {
  getRates(
    pkg: PackageDetails,
    origin: Address,
    destination: Address
  ): Promise<RateQuote[]>;
  buyLabel(params: BuyLabelParams): Promise<LabelResult>;
  trackShipment(trackingNumber: string): Promise<TrackingStatus>;
  validateAddress(address: Address): Promise<AddressValidationResult>;
}
