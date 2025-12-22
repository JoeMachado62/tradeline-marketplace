import { TradelineSupplyAPI } from "../TradelineSupplyAPI";
import { Tradeline } from "@/types";

describe("TradelineSupplyAPI", () => {
  let api: TradelineSupplyAPI;

  beforeEach(() => {
    api = new TradelineSupplyAPI(
      "test_consumer_key",
      "test_consumer_secret",
      "https://test.tradelinesupply.com/wp-json/wc/v3"
    );
  });

  describe("OAuth Signature Generation", () => {
    it("should generate valid OAuth 1.0a headers", () => {
      const headers = (api as any).getAuthHeader("https://test.com/api", "GET");

      expect(headers).toHaveProperty("Authorization");
      expect(headers.Authorization).toContain("OAuth");
      expect(headers.Authorization).toContain("oauth_consumer_key=");
      expect(headers.Authorization).toContain("oauth_signature=");
      expect(headers.Authorization).toContain(
        'oauth_signature_method="HMAC-SHA1"'
      );
      expect(headers.Authorization).toContain("oauth_timestamp=");
      expect(headers.Authorization).toContain("oauth_nonce=");
    });
  });

  describe("getPricing", () => {
    it("should return array of tradelines with correct structure", async () => {
      // Mock successful response
      // @ts-ignore
      jest.spyOn(api["axios"], "get").mockResolvedValue({
        data: [
          {
            card_id: "TEST123",
            bank_name: "Chase Sapphire",
            credit_limit: 15000,
            price: 1000, 
            stock: 5,
            date_opened: "2019-01-15",
            purchase_deadline: "2024-12-31",
            reporting_period: "2024-01-15",
            image: "https://tradelinerental.com/chase.png",
          } as Tradeline,
        ],
      });

      const pricing = await api.getPricing();

      expect(Array.isArray(pricing)).toBe(true);
      expect(pricing).toHaveLength(1);
      expect(pricing[0].card_id).toBe("TEST123");
    });
  });
});
