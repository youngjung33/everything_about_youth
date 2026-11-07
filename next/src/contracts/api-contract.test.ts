import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listServerErrorCodes } from "@/common/presentation/api/error-catalog";
import {
  contractAppConfigDto,
  contractFeaturesDto,
  contractBenefitsMetaDto,
  contractFinanceMetaDto,
  contractJobsMetaDto,
  contractPostingDetailDto,
  contractPostingListDto,
  contractGuideDetailDto,
  contractGuideListDto,
  contractLivingMetaDto,
  contractHousingMetaDto,
  contractNoticeDetailDto,
  contractNoticeListDto,
  contractProgramDetailDto,
  contractProgramListDto,
  contractSchemeDetailDto,
  contractSchemeListDto,
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

  it("benefits-program-list.json", () => {
    expect(contractProgramListDto()).toEqual(readContract("benefits-program-list.json"));
  });

  it("benefits-program-detail.json", () => {
    expect(contractProgramDetailDto()).toEqual(readContract("benefits-program-detail.json"));
  });

  it("benefits-meta.json", () => {
    expect(contractBenefitsMetaDto()).toEqual(readContract("benefits-meta.json"));
  });

  it("finance-scheme-list.json", () => {
    expect(contractSchemeListDto()).toEqual(readContract("finance-scheme-list.json"));
  });

  it("finance-scheme-detail.json", () => {
    expect(contractSchemeDetailDto()).toEqual(readContract("finance-scheme-detail.json"));
  });

  it("finance-meta.json", () => {
    expect(contractFinanceMetaDto()).toEqual(readContract("finance-meta.json"));
  });

  it("jobs-posting-list.json", () => {
    expect(contractPostingListDto()).toEqual(readContract("jobs-posting-list.json"));
  });

  it("jobs-posting-detail.json", () => {
    expect(contractPostingDetailDto()).toEqual(readContract("jobs-posting-detail.json"));
  });

  it("jobs-meta.json", () => {
    expect(contractJobsMetaDto()).toEqual(readContract("jobs-meta.json"));
  });

  it("living-guide-list.json", () => {
    expect(contractGuideListDto()).toEqual(readContract("living-guide-list.json"));
  });

  it("living-guide-detail.json", () => {
    expect(contractGuideDetailDto()).toEqual(readContract("living-guide-detail.json"));
  });

  it("living-meta.json", () => {
    expect(contractLivingMetaDto()).toEqual(readContract("living-meta.json"));
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
