import { describe, expect, it } from "vitest";
import { createNotice } from "@/features/housing/domain/identity";
import { ApplyhomeSource } from "./applyhome/applyhome-source";
import { mapApplyhomeDetail, mapApplyhomeModels, pickApplicationPeriod } from "./applyhome/applyhome-mapper";
import { LhSource } from "./lh/lh-source";
import { mapLhItem } from "./lh/lh-mapper";
import { applyLhSupply, mapLhSupply } from "./lh/lh-supply-mapper";
import { mapMyhomeItems } from "./myhome/myhome-mapper";
import { MyhomeSource } from "./myhome/myhome-source";

const FETCHED_AT = "2026-10-12T03:00:00.000Z";
const ctx = { fetchedAt: FETCHED_AT, today: "2026-10-12" };

describe("LH", () => {
  const item = {
    RNUM: "1",
    UPP_AIS_TP_NM: "임대주택",
    AIS_TP_CD_NM: "행복주택",
    PAN_NM: "서울강남 A1블록 행복주택 입주자 모집",
    CNP_CD_NM: "서울특별시",
    PAN_SS: "접수중",
    PAN_NT_ST_DT: "2026.10.01",
    CLSG_DT: "2026.10.20",
    PAN_ID: "0000059133",
    DTL_URL: "https://apply.lh.or.kr/detail?panId=0000059133",
    ALL_CNT: "1",
  };

  it("목록 항목을 공고로 매핑한다", () => {
    const d = mapLhItem(item, ctx)!;
    expect(d).toMatchObject({
      title: "서울강남 A1블록 행복주택 입주자 모집",
      supplyType: "happy_housing",
      regions: [{ sido: "서울", sigungu: null }],
      applicationEnd: "2026-10-20",
      announcementDate: "2026-10-01",
      url: item.DTL_URL,
    });
    expect(d.sources[0]).toMatchObject({ source: "lh", externalId: "0000059133" });
  });

  it("분양주택은 공공분양, 마감 상태는 종료일을 과거로 보정", () => {
    const d = mapLhItem({ ...item, UPP_AIS_TP_NM: "분양주택", AIS_TP_CD_NM: "공공분양", PAN_SS: "접수마감" }, ctx)!;
    expect(d.supplyType).toBe("public_sale");
    expect(d.applicationEnd).toBe("2026-10-11");
  });

  it("필수값이 없으면 건너뛴다", () => {
    expect(mapLhItem({ PAN_NM: "x" }, ctx)).toBeNull();
  });

  it("10년/50년 공공임대는 공공임대로 분류한다", () => {
    expect(mapLhItem({ ...item, AIS_TP_CD_NM: "공공임대", PAN_NM: "음성금왕1 50년공공임대주택 예비입주자 모집" }, ctx)!.supplyType).toBe(
      "public_rental",
    );
    expect(mapLhItem({ ...item, AIS_TP_CD_NM: "공공임대", PAN_NM: "의정부송산3단지 공임50년 예비입주자 표준모집공고문" }, ctx)!.supplyType).toBe(
      "public_rental",
    );
  });

  it("어린이집·상가 등 주택이 아닌 공고는 제외한다", () => {
    expect(mapLhItem({ ...item, AIS_TP_CD_NM: "가정어린이집", PAN_NM: "가정어린이집 임대 공고" }, ctx)).toBeNull();
  });

  it("PAN_ID 가 없으면 공고상세URL 에서 꺼낸다", () => {
    const url = "https://apply.lh.or.kr/LH/index.html?gv_param=CCR_CNNT_SYS_DS_CD:02,PAN_ID:0000059133,LCC:Y";
    const d = mapLhItem({ ...item, PAN_ID: undefined, DTL_URL: url }, ctx)!;
    expect(d.sources[0]).toMatchObject({ externalId: "0000059133" });
  });

  it("페이지를 순회해 수집한다 (LH 응답: 배열 형태)", async () => {
    const urls: string[] = [];
    const page = (n: number) =>
      JSON.stringify([
        { dsSch: [{ PAN_ST: "x" }] },
        {
          dsList: Array.from({ length: n === 1 ? 100 : 2 }, (_, i) => ({ ...item, PAN_ID: `p${n}-${i}`, ALL_CNT: "102" })),
          resHeader: [{ SS_CODE: "Y" }],
        },
      ]);
    const source = new LhSource({
      serviceKey: "k%2B",
      delayMs: 0,
      getText: async (url) => {
        urls.push(url);
        const u = new URL(url);
        // 임대주택(06)만 데이터가 있다
        if (u.searchParams.get("UPP_AIS_TP_CD") !== "06") return JSON.stringify([{ dsSch: [] }, { resHeader: [{ SS_CODE: "Y" }] }]);
        return page(Number(u.searchParams.get("PAGE")));
      },
    });
    const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
    expect(drafts).toHaveLength(102);
    expect(new URL(urls[0]!).searchParams.get("serviceKey")).toBe("k+");
    expect(new URL(urls[0]!).searchParams.get("PAN_NT_ST_DT")).toBe("2026.06.14");
  });

  it("서비스키가 없으면 사용 불가", () => {
    expect(new LhSource({}).checkAvailability().available).toBe(false);
  });
});

describe("LH 공급정보 (실제 응답 형식)", () => {
  const defaults = { region: { sido: "경기" as const, sigungu: null }, housingType: "apartment" as const };

  // A) 공공분양/공공임대: dsList01(분양) / dsList02(임대)
  const sale = [
    { dsSch: [{ PAN_ID: "0000061158" }] },
    {
      dsList01Nm: [{ BZDT_NM: "단지명" }],
      resHeader: [{ SS_CODE: "Y" }],
      dsList01: [
        { RSDN_DDO_AR: "59.74", BZDT_NM: "양주회천(택) A26", SIL_HSH_CNT: "262", HTY_NM: "59.7400A", SPL_AR: "82.6719", SIL_AMT: "353694000", TOT_HSH_CNT: "262" },
        { RSDN_DDO_AR: "84.86", BZDT_NM: "양주회천(택) A26", SIL_HSH_CNT: "230", HTY_NM: "84.8600A", SPL_AR: "117.4346", SIL_AMT: "487731000", TOT_HSH_CNT: "230" },
      ],
      dsList02: [],
    },
  ];
  const rental = [
    {
      dsList01: [],
      dsList02: [
        { RSDN_DDO_AR: "74.9", BZDT_NM: "대구금호B-1(공임리츠) B-1", SIL_HSH_CNT: "0", LS_GMY: "53000000", HTY_NM: "74.9000A", MM_RFE: "550000", TOT_HSH_CNT: "97" },
        { RSDN_DDO_AR: "84.9", BZDT_NM: "대구금호B-1(공임리츠) B-1", SIL_HSH_CNT: "0", LS_GMY: "63000000", HTY_NM: "84.9000A", MM_RFE: "610000", TOT_HSH_CNT: "338" },
        { RSDN_DDO_AR: "59.72", BZDT_NM: "대구연경 A-1(공임리츠) A-1", SIL_HSH_CNT: "5", LS_GMY: "48300000", HTY_NM: "59.7200A", MM_RFE: "451500", TOT_HSH_CNT: "646" },
      ],
    },
  ];
  // B) 행복/국민/영구/통합: 보증금·월세가 "공고문 참조"
  const happy = [
    {
      resHeader: [{ SS_CODE: "Y" }],
      dsList01: [
        { RFE: "공고문 참조", NOW_HSH_CNT: "300", HSH_CNT: "582", HTY_NNA: "16A", LS_GMY: "공고문 참조", SBD_LGO_NM: "아산배방(주복2) 행복주택", DDO_AR: "16.67", SPL_AR: "26.9035" },
        { RFE: "공고문 참조", NOW_HSH_CNT: "50", HSH_CNT: "128", HTY_NNA: "16A", LS_GMY: "공고문 참조", SBD_LGO_NM: "아산배방2 A12BL 행복주택", DDO_AR: "16.79", SPL_AR: "26.4102" },
      ],
    },
  ];
  // C) 매입임대: 지역명/주택정보/공급호수, 주택형은 면적 범위
  const purchase = [
    {
      dsList01: [
        { HTY_DS_NM: "60~70㎡", DNG_HS_ADR: "부산진구(가화만사성 더 테라스)", SGG_NM: "부산광역시 부산진구", LTR_SPL_RMNO: "12", QUP_CNT: "36" },
        { HTY_DS_NM: "70~80㎡", DNG_HS_ADR: "부산진구(가화만사성 더 테라스)", SGG_NM: "부산광역시 부산진구", LTR_SPL_RMNO: "24", QUP_CNT: "72" },
        { HTY_DS_NM: "80㎡ 이상", DNG_HS_ADR: "부산 사상구(보해 썬시티 리버파크)", SGG_NM: "부산광역시 사상구", LTR_SPL_RMNO: "20", QUP_CNT: "60" },
      ],
    },
  ];

  it("분양: 단지별로 묶고 평균분양가를 deposit 으로, 금회공급 세대수를 합산", () => {
    const s = mapLhSupply(sale, defaults)!;
    expect(s.totalHouseholds).toBe(492);
    expect(s.complexes).toHaveLength(1);
    expect(s.complexes[0]).toMatchObject({ name: "양주회천(택) A26", households: 492, region: { sido: "경기", sigungu: null } });
    expect(s.complexes[0]!.units[1]).toEqual({ name: "84.8600A", exclusiveAreaM2: 84.86, households: 230, deposit: 487_731_000, monthlyRent: null });
  });

  it("임대: 보증금/월임대료를 채우고, 금회공급 0 은 세대수 없음으로 둔다", () => {
    const s = mapLhSupply(rental, defaults)!;
    expect(s.complexes.map((c) => c.name)).toEqual(["대구금호B-1(공임리츠) B-1", "대구연경 A-1(공임리츠) A-1"]);
    expect(s.complexes[0]!.households).toBeNull();
    expect(s.complexes[0]!.units[0]).toMatchObject({ households: null, deposit: 53_000_000, monthlyRent: 550_000, exclusiveAreaM2: 74.9 });
    expect(s.complexes[1]!.households).toBe(5);
    expect(s.totalHouseholds).toBe(5);
  });

  it('"공고문 참조" 같은 문자열 금액은 숫자로 바꾸지 않는다', () => {
    const s = mapLhSupply(happy, defaults)!;
    expect(s.totalHouseholds).toBe(350);
    expect(s.complexes).toHaveLength(2);
    expect(s.complexes[0]!.units[0]).toEqual({ name: "16A", exclusiveAreaM2: 16.67, households: 300, deposit: null, monthlyRent: null });
  });

  it("매입임대: 지역명으로 시군구를 채우고 공급호수를 합산, 범위 면적은 쓰지 않음", () => {
    const s = mapLhSupply(purchase, { region: { sido: "부산", sigungu: null }, housingType: "multi_family" })!;
    expect(s.totalHouseholds).toBe(56);
    expect(s.complexes.map((c) => c.region)).toEqual([
      { sido: "부산", sigungu: "부산진구" },
      { sido: "부산", sigungu: "사상구" },
    ]);
    expect(s.complexes[0]!.units[0]).toMatchObject({ name: "60~70㎡", exclusiveAreaM2: null, households: 12 });
  });

  it("일반 매입임대(136): 호별 목록을 호수·면적·주소로 변환하고 1행을 1세대로 센다", () => {
    const houses = [
      {
        resHeader: [{ SS_CODE: "Y" }],
        dsList01: [
          { HO_NO: "302호", SBD_LGO_NM: "매입다가구(강원강릉시)", DDO_AR: "54.44", VLD_VL_NM: "3층", ADR: "강원특별자치도 강릉시 강변북길 259(송정동) " },
          { HO_NO: "402호", SBD_LGO_NM: "매입다가구(강원원주시)", DDO_AR: "21.9", VLD_VL_NM: "4층", ADR: "강원특별자치도 원주시 단관초교길 30-6(관설동) " },
          { HO_NO: "203호", SBD_LGO_NM: "매입다가구(강원원주시)", DDO_AR: "21.805", VLD_VL_NM: "2층", ADR: "강원특별자치도 원주시 문막읍 고청동길 10-11 " },
          { HO_NO: "301호", SBD_LGO_NM: "매입다가구(강원원주시)", DDO_AR: "21.6", VLD_VL_NM: "3층", ADR: "강원특별자치도 원주시 문막읍 고청동길 10-11 " },
        ],
      },
    ];
    const s = mapLhSupply(houses, { region: { sido: "강원", sigungu: null }, housingType: "multi_family" })!;
    expect(s.totalHouseholds).toBe(4);
    // 같은 주소의 호는 한 건물(단지)로 묶인다
    expect(s.complexes).toHaveLength(3);
    expect(s.complexes[2]).toMatchObject({ households: 2, region: { sido: "강원", sigungu: "원주시" } });
    expect(s.complexes[0]!.units[0]).toEqual({ name: "302호 (3층)", exclusiveAreaM2: 54.44, households: 1, deposit: null, monthlyRent: null });
  });

  it("모집인원만 있는 형식(135)은 세대수로 오해하지 않도록 무시한다", () => {
    const body = [{ dsList01: [{ HTY_DS_NM: "1형", SBD_LGO_NM: "매입다가구(광주남구)", QUP_CNT: "200", RQS_HSH_CNT: "2인 이하 가구" }] }];
    expect(mapLhSupply(body, defaults)).toBeNull();
  });

  it("알 수 없는 형식이거나 비어 있으면 null", () => {
    expect(mapLhSupply([{ dsList01: [] }], defaults)).toBeNull();
    expect(mapLhSupply([{ dsList01: [{ LND_US_DS_CD_NM: "분양상가", AR: "10" }] }], defaults)).toBeNull();
    expect(mapLhSupply({}, defaults)).toBeNull();
  });

  it("공고에 반영: 시군구가 있는 지역이 시도 지역을 대체한다", () => {
    const draft = mapLhItem(
      { UPP_AIS_TP_NM: "임대주택", AIS_TP_CD_NM: "매입임대", PAN_NM: "부산 매입임대", CNP_CD_NM: "부산광역시", PAN_ID: "1", PAN_SS: "접수중", CLSG_DT: "2026.10.30" },
      ctx,
    )!;
    const supply = mapLhSupply(purchase, { region: draft.regions[0] ?? null, housingType: "multi_family" })!;
    const merged = applyLhSupply(draft, supply);
    expect(merged.regions).toEqual([
      { sido: "부산", sigungu: "부산진구" },
      { sido: "부산", sigungu: "사상구" },
    ]);
    expect(merged.totalHouseholds).toBe(56);
    expect(merged.complexes).toHaveLength(2);
  });

  describe("LhSource 연동", () => {
    const listItem = (id: string, extra: Record<string, string> = {}) => ({
      UPP_AIS_TP_NM: "임대주택",
      AIS_TP_CD_NM: "행복주택",
      PAN_NM: `행복주택 ${id}`,
      CNP_CD_NM: "충청남도",
      PAN_SS: "접수중",
      PAN_NT_ST_DT: "2026.10.01",
      CLSG_DT: "2026.10.20",
      PAN_ID: id,
      SPL_INF_TP_CD: "063",
      CCR_CNNT_SYS_DS_CD: "03",
      UPP_AIS_TP_CD: "06",
      AIS_TP_CD: "10",
      ALL_CNT: "3",
      ...extra,
    });
    const listBody = JSON.stringify([
      { dsSch: [] },
      { dsList: [listItem("A1"), listItem("A2"), listItem("A3", { SPL_INF_TP_CD: "" })], resHeader: [{ SS_CODE: "Y" }] },
    ]);

    it("공고마다 공급정보를 조회해 반영하고, 실패한 공고는 목록 정보만 유지한다", async () => {
      const warnings: string[] = [];
      const supplyCalls: string[] = [];
      const source = new LhSource({
        serviceKey: "k",
        delayMs: 0,
        onWarn: (m) => warnings.push(m),
        getText: async (url) => {
          const u = new URL(url);
          if (u.pathname.endsWith("getLeaseNoticeSplInfo1")) {
            supplyCalls.push(u.searchParams.get("PAN_ID")!);
            expect(Object.fromEntries(u.searchParams)).toMatchObject({
              SPL_INF_TP_CD: "063",
              CCR_CNNT_SYS_DS_CD: "03",
              UPP_AIS_TP_CD: "06",
              AIS_TP_CD: "10",
            });
            if (u.searchParams.get("PAN_ID") === "A2") throw new Error("boom");
            return JSON.stringify(happy);
          }
          // 목록은 임대주택(06)에만 있다 (같은 응답이 페이지 1 에서 끝나도록 100건 미만)
          return u.searchParams.get("UPP_AIS_TP_CD") === "06" ? listBody : JSON.stringify([{ dsSch: [] }, { resHeader: [{ SS_CODE: "Y" }] }]);
        },
      });
      const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
      expect(drafts).toHaveLength(3);
      // A3 는 SPL_INF_TP_CD 가 없어 조회하지 않는다
      expect(supplyCalls).toEqual(["A1", "A2"]);
      expect(drafts[0]!.totalHouseholds).toBe(350);
      expect(drafts[0]!.complexes).toHaveLength(2);
      expect(drafts[1]!.totalHouseholds).toBeNull();
      expect(drafts[1]!.complexes).toHaveLength(0);
      expect(drafts[2]!.complexes).toHaveLength(0);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("A2");
    });

    it("같은 공고는 한 번만 조회하고 동시 조회해도 공고 순서를 유지한다", async () => {
      const calls: string[] = [];
      const body = JSON.stringify([
        {
          dsList: [listItem("B1"), listItem("B2"), listItem("B1"), listItem("B3")],
          resHeader: [{ SS_CODE: "Y" }],
        },
      ]);
      const source = new LhSource({
        serviceKey: "k",
        delayMs: 0,
        supplyConcurrency: 3,
        getText: async (url) => {
          const u = new URL(url);
          if (u.pathname.endsWith("getLeaseNoticeSplInfo1")) {
            const id = u.searchParams.get("PAN_ID")!;
            calls.push(id);
            // B1 이 가장 늦게 끝나도 결과 순서는 바뀌지 않아야 한다
            await new Promise((r) => setTimeout(r, id === "B1" ? 20 : 1));
            return JSON.stringify(happy);
          }
          return u.searchParams.get("UPP_AIS_TP_CD") === "06" ? body : JSON.stringify([{ dsSch: [] }, { resHeader: [{ SS_CODE: "Y" }] }]);
        },
      });
      const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
      expect([...calls].sort()).toEqual(["B1", "B2", "B3"]);
      expect(drafts.map((d) => d.sources[0]!.externalId)).toEqual(["B1", "B2", "B1", "B3"]);
      expect(drafts.every((d) => d.totalHouseholds === 350)).toBe(true);
    });

    it("fetchSupply=false 면 공급정보를 조회하지 않는다", async () => {
      let supplyCalls = 0;
      const source = new LhSource({
        serviceKey: "k",
        delayMs: 0,
        fetchSupply: false,
        getText: async (url) => {
          if (url.includes("getLeaseNoticeSplInfo1")) supplyCalls++;
          return listBody;
        },
      });
      await source.fetchNotices({ fetchedAt: FETCHED_AT });
      expect(supplyCalls).toBe(0);
    });

    it("일일 한도 초과(22)면 이후 공고의 조회를 중단한다", async () => {
      const calls: string[] = [];
      const source = new LhSource({
        serviceKey: "k",
        delayMs: 0,
        supplyConcurrency: 1,
        onWarn: () => {},
        getText: async (url) => {
          const u = new URL(url);
          if (u.pathname.endsWith("getLeaseNoticeSplInfo1")) {
            calls.push(u.searchParams.get("PAN_ID")!);
            return JSON.stringify({ response: { header: { resultCode: "22", resultMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR" } } });
          }
          return u.searchParams.get("UPP_AIS_TP_CD") === "06" ? listBody : JSON.stringify([{ dsSch: [] }, { resHeader: [{ SS_CODE: "Y" }] }]);
        },
      });
      const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
      expect(calls).toEqual(["A1"]);
      expect(drafts).toHaveLength(3);
    });
  });
});

describe("마이홈", () => {
  const rows = [
    {
      pblancId: "1001",
      pblancNm: "서울 행복주택 모집",
      suplyInsttNm: "SH서울주택도시공사",
      houseTyNm: "아파트",
      suplyTyNm: "행복주택",
      beginDe: "20261005",
      endDe: "20261016",
      przwnerPresnatnDe: "20261101",
      hsmpNm: "가단지",
      brtcNm: "서울특별시",
      signguNm: "강동구",
      fullAdres: "서울특별시 강동구 천호동 1",
      suplyHoCo: 10,
      suplyPrvuseAr: "26.5",
      rentGtn: 15_000_000,
      mtRntchrg: 120_000,
      url: "https://www.myhome.go.kr/x",
    },
    {
      pblancId: "1001",
      pblancNm: "서울 행복주택 모집",
      suplyInsttNm: "SH서울주택도시공사",
      houseTyNm: "아파트",
      suplyTyNm: "행복주택",
      beginDe: "20261005",
      endDe: "20261016",
      hsmpNm: "가단지",
      brtcNm: "서울특별시",
      signguNm: "강동구",
      fullAdres: "서울특별시 강동구 천호동 1",
      suplyHoCo: 5,
      suplyPrvuseAr: "36.1",
      rentGtn: 25_000_000,
      mtRntchrg: 180_000,
    },
    {
      pblancId: "1002",
      pblancNm: "경기 청년 매입임대",
      suplyInsttNm: "LH경기",
      houseTyNm: {},
      suplyTyNm: "청년매입임대",
      beginDe: "2026-10-12",
      endDe: "2026-10-30",
      brtcNm: "경기도",
      signguNm: "수원시",
    },
  ];

  it("같은 공고의 행을 묶어 단지/세대유형으로 만든다", () => {
    const drafts = mapMyhomeItems(rows, { fetchedAt: FETCHED_AT });
    expect(drafts).toHaveLength(2);
    const a = drafts[0]!;
    expect(a).toMatchObject({
      title: "서울 행복주택 모집",
      organization: "SH서울주택도시공사",
      supplyType: "happy_housing",
      housingTypes: ["apartment"],
      applicationStart: "2026-10-05",
      applicationEnd: "2026-10-16",
      winnerAnnouncementDate: "2026-11-01",
      totalHouseholds: 15,
    });
    expect(a.complexes).toHaveLength(1);
    expect(a.complexes[0]!.units).toHaveLength(2);
    expect(a.complexes[0]!.units[1]).toMatchObject({ exclusiveAreaM2: 36.1, deposit: 25_000_000, monthlyRent: 180_000 });
    expect(drafts[1]).toMatchObject({ supplyType: "youth_purchase_rental", regions: [{ sido: "경기", sigungu: "수원시" }], housingTypes: [] });
  });

  it("값이 없을 때 오는 0 은 null 로, 세대수는 sumSuplyCo 로 채운다", () => {
    const [d] = mapMyhomeItems(
      [
        {
          pblancId: "2001",
          pblancNm: "영주시 드림주택 매입임대",
          suplyInsttNm: "경상북도개발공사",
          suplyTyNm: "매입임대",
          suplyHoCo: "",
          sumSuplyCo: 20,
          rentGtn: 0,
          mtRntchrg: 0,
          hsmpNm: "단지",
          brtcNm: "경상북도",
        },
      ],
      { fetchedAt: FETCHED_AT },
    );
    expect(d!.totalHouseholds).toBe(20);
    expect(d!.complexes[0]!.units[0]).toBeUndefined();
    expect(d!.complexes[0]!.households).toBe(20);
  });

  it("50년임대/10년임대는 공공임대", () => {
    const [d] = mapMyhomeItems([{ pblancId: "2002", pblancNm: "익산 공공임대", suplyTyNm: "50년임대" }], { fetchedAt: FETCHED_AT });
    expect(d!.supplyType).toBe("public_rental");
  });

  it("시도별로 조회하고 중복 행은 제거한다 (XML/JSON 모두 허용)", async () => {
    const calls: string[] = [];
    const source = new MyhomeSource({
      serviceKey: "key",
      delayMs: 0,
      getText: async (url) => {
        calls.push(url);
        // 모든 시도에서 같은 데이터를 돌려준다 → 중복 제거 확인
        return JSON.stringify({ response: { header: { resultCode: "00" }, body: { totalCount: 3, item: rows } } });
      },
    });
    const drafts = await source.fetchNotices({ fetchedAt: FETCHED_AT });
    expect(calls).toHaveLength(17);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]!.complexes[0]!.units).toHaveLength(2);
  });
});

describe("청약홈", () => {
  const apt = {
    HOUSE_MANAGE_NO: "2026000090",
    PBLANC_NO: "2026000090",
    HOUSE_NM: "중흥S-클래스 여수",
    HOUSE_SECD_NM: "APT",
    HOUSE_DTL_SECD_NM: "민영",
    RENT_SECD_NM: "분양주택",
    SUBSCRPT_AREA_CODE_NM: "전남",
    HSSPLY_ADRES: "전라남도 여수시 소호동 123",
    TOT_SUPLY_HSHLDCO: "1095",
    RCRIT_PBLANC_DE: "2026-10-01",
    SPSPLY_RCEPT_BGNDE: "2026-10-12",
    SPSPLY_RCEPT_ENDDE: "2026-10-14",
    RCEPT_BGNDE: "2026-10-15",
    RCEPT_ENDDE: "2026-10-16",
    GNRL_RNK1_CRSPAREA_RCPTDE: "2026-10-15",
    GNRL_RNK1_CRSPAREA_ENDDE: "2026-10-15",
    PRZWNER_PRESNATN_DE: "2026-10-23",
    CNTRCT_CNCLS_BGNDE: "2026-11-03",
    CNTRCT_CNCLS_ENDDE: "2026-11-05",
    BSNS_MBY_NM: "중흥토건",
    PBLANC_URL: "https://www.applyhome.co.kr/x",
  };

  it("접수 기간은 특별공급~일반공급 전체로 계산하고 계약일은 제외", () => {
    expect(pickApplicationPeriod(apt)).toEqual({ start: "2026-10-12", end: "2026-10-16" });
  });

  it("공공지원민간임대·잔여세대는 SUBSCRPT_RCEPT 한 쌍을 접수기간으로 쓴다", () => {
    expect(
      pickApplicationPeriod({
        SUBSCRPT_RCEPT_BGNDE: "20260107",
        SUBSCRPT_RCEPT_ENDDE: "20260109",
        CNTRCT_CNCLS_BGNDE: "20260115",
        CNTRCT_CNCLS_ENDDE: "20260117",
        GNRL_RCEPT_BGNDE: null,
      }),
    ).toEqual({ start: "2026-01-07", end: "2026-01-09" });
  });

  it("APT 분양 공고 매핑", () => {
    const d = mapApplyhomeDetail(apt, "apt", { fetchedAt: FETCHED_AT })!;
    expect(d).toMatchObject({
      title: "중흥S-클래스 여수",
      organization: "중흥토건",
      supplyType: "private_sale",
      housingTypes: ["apartment"],
      regions: [{ sido: "전남", sigungu: "여수시" }],
      applicationStart: "2026-10-12",
      applicationEnd: "2026-10-16",
      winnerAnnouncementDate: "2026-10-23",
      totalHouseholds: 1095,
    });
    expect(d.sources[0]!.externalId).toBe("apt:2026000090:2026000090");
  });

  it("국민주택은 공공분양, 오피스텔/민간임대 구분", () => {
    expect(mapApplyhomeDetail({ ...apt, HOUSE_DTL_SECD_NM: "국민" }, "apt", { fetchedAt: FETCHED_AT })!.supplyType).toBe("public_sale");
    const office = mapApplyhomeDetail({ ...apt, HOUSE_SECD_NM: "오피스텔", HOUSE_DTL_SECD_NM: "오피스텔" }, "urbty", {
      fetchedAt: FETCHED_AT,
    })!;
    expect(office).toMatchObject({ supplyType: "private_sale", housingTypes: ["officetel"] });
    const rent = mapApplyhomeDetail({ ...apt, HOUSE_SECD_NM: "민간임대", HOUSE_DTL_SECD_NM: "" }, "urbty", { fetchedAt: FETCHED_AT })!;
    expect(rent.supplyType).toBe("private_rental");
    expect(mapApplyhomeDetail(apt, "pblPvtRent", { fetchedAt: FETCHED_AT })!.supplyType).toBe("public_support_rental");
  });

  it("주택형 정보를 세대유형(원 단위)으로 변환", () => {
    const units = mapApplyhomeModels([
      { HOUSE_TY: "084.9587A", SUPLY_AR: "110.5145", SUPLY_HSHLDCO: 118, SPSPLY_HSHLDCO: 339, LTTOT_TOP_AMOUNT: "47,550" },
      { HOUSE_TY: "109.9697A", SUPLY_HSHLDCO: 37, SPSPLY_HSHLDCO: 9, LTTOT_TOP_AMOUNT: 65200 },
    ]);
    expect(units[0]).toEqual({ name: "084.9587A", exclusiveAreaM2: 84.9587, households: 457, deposit: 475_500_000, monthlyRent: null });
    expect(units[1]!.deposit).toBe(652_000_000);
  });

  it("상세 → 주택형 순으로 호출하고, 주택형 실패는 무시한다", async () => {
    const warnings: string[] = [];
    const source = new ApplyhomeSource({
      serviceKey: "key",
      delayMs: 0,
      onWarn: (m) => warnings.push(m),
      getText: async (url) => {
        const u = new URL(url);
        if (u.pathname.endsWith("getAPTLttotPblancDetail")) {
          return JSON.stringify({ currentCount: 1, matchCount: 1, page: 1, perPage: 100, totalCount: 1, data: [apt] });
        }
        if (u.pathname.endsWith("getAPTLttotPblancMdl")) {
          return JSON.stringify({ data: [{ HOUSE_TY: "084.9587A", SUPLY_HSHLDCO: 10, SPSPLY_HSHLDCO: 0, LTTOT_TOP_AMOUNT: "47,550" }] });
        }
        if (u.pathname.endsWith("getUrbtyOfctlLttotPblancDetail")) {
          return JSON.stringify({ data: [{ ...apt, HOUSE_MANAGE_NO: "U1", HOUSE_SECD_NM: "오피스텔" }] });
        }
        if (u.pathname.endsWith("getUrbtyOfctlLttotPblancMdl")) throw new Error("boom");
        return JSON.stringify({ data: [] });
      },
    });
    const drafts = await source.fetchNotices({ fetchedAt: "2026-10-13T00:00:00.000Z" });
    expect(drafts).toHaveLength(2);
    expect(drafts[0]!.complexes[0]!.units[0]).toMatchObject({ deposit: 475_500_000 });
    expect(drafts[1]!.complexes[0]!.units).toHaveLength(0);
    expect(warnings[0]).toContain("U1");
  });
});

describe("소스 간 중복 병합 키", () => {
  it("LH 와 마이홈의 같은 공고는 같은 id", () => {
    const a = createNotice(
      mapLhItem(
        {
          PAN_ID: "1",
          PAN_NM: "서울 행복주택 모집",
          AIS_TP_CD_NM: "행복주택",
          CNP_CD_NM: "서울특별시",
          CLSG_DT: "2026.10.16",
          PAN_NT_ST_DT: "2026.10.01",
        },
        ctx,
      )!,
    );
    const b = createNotice(mapMyhomeItems([{ pblancId: "9", pblancNm: "서울 행복주택 모집", suplyInsttNm: "한국토지주택공사", suplyTyNm: "행복주택", endDe: "20261016" }], { fetchedAt: FETCHED_AT })[0]!);
    expect(a.id).toBe(b.id);
  });
});
