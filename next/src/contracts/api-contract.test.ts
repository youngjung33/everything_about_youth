import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listServerErrorCodes } from "@/common/presentation/api/error-catalog";
import {
  contractAppConfigDto,
  contractFeaturesDto,
  contractHousingMetaDto,
  contractNoticeDetailDto,
  contractNoticeListDto,
  contractSessionDto,
} from "./api-samples";

const contractsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../contracts/api");

function readContract(name: string): unknown {
  return JSON.parse(readFileSync(path.join(contractsDir, name), "utf8"));
}

describe("API 계약 JSON (서버 DTO ↔ contracts/api)", () => {
  it("housing-notice-list.json", () => {
    expect(contractNoticeListDto()).toEqual(readContract("housing-notice-list.json"));
  });

  it("housing-notice-detail.json", () => {
    expect(contractNoticeDetailDto()).toEqual(readContract("housing-notice-detail.json"));
  });

  it("housing-meta.json", () => {
    expect(contractHousingMetaDto()).toEqual(readContract("housing-meta.json"));
  });

  it("auth-session.json", () => {
    expect(contractSessionDto()).toEqual(readContract("auth-session.json"));
  });

  it("app-config.json", () => {
    expect(contractAppConfigDto()).toEqual(readContract("app-config.json"));
  });

  it("features.json", () => {
    expect(contractFeaturesDto()).toEqual(readContract("features.json"));
  });

  it("error-codes.json", () => {
    const contract = readContract("error-codes.json") as { server: unknown[] };
    expect(listServerErrorCodes()).toEqual(contract.server);
  });
});
