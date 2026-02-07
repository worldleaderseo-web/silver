# SilverPulse

실버바 시세/매물/프리미엄/공급량 대시보드 + 조건 탐색/알림을 위한 설계서 초안입니다.

## 프로젝트 목표
- SHFE, DGCX, Investing.com 은 선물 3종을 동시에 모니터링하고 USD/oz로 표준화
- KRW/oz, KRW/kg 동시 제공
- 선물 기반 현물(spot) 추정 및 VAT 포함 프리미엄 밴드(P20~P50) 산출
- 당근/번개 판매 매물만 집계하여 1kg 기준 중고 평균 단가 및 1oz 시계열 제공
- 3개 실버바 판매 사이트의 VAT 제거(공급가 역산) 비교
- 조건 매입 탐색 + 텔레그램 알림

## 단위/변환 상수
- 1 troy oz = 31.1034768 g
- 1 kg = 1000 g
- 1 kg = 32.1507466 troy oz

## 데이터 소스 (Provider 추상화)
- **FuturesProvider**: SHFE(AG, CNY/kg), DGCX(USD/oz), Investing.com(USD/oz)
- **FXProvider**: USDKRW, USDCNY
- **MarketplaceProvider**: 당근마켓, 번개장터
- **RetailSiteProvider**: 대성금속, 국제표준, 아시아골드

Provider 교체로 차단/지연에 대응합니다.

## 변환 공식
### SHFE (CNY/kg) → USD/oz
```
cny_per_oz = cny_per_kg / 32.1507466
usd_per_oz = cny_per_oz / (CNY per USD)
```

### USD/oz → KRW/oz, KRW/kg
```
krw_per_oz = usd_per_oz * USDKRW
krw_per_kg = krw_per_oz * 32.1507466
```

## Spot 추정
### A) 단순 Basis 보정 (MVP 기본값)
```
spot_usd_per_oz = futures_usd_per_oz - basis_usd_per_oz
```

### B) 캐리코스트 모델 (옵션)
```
spot = futures / exp((r + storage - convenience) * T)
```

대표(Composite) 선물은 3개 소스의 가중 평균으로 산출하고, 해당 값에 SpotEstimator를 적용합니다.

## 프리미엄 구간 가격대
1. spot_krw_per_kg 계산
2. VAT 포함: `vat_included = spot_krw_per_kg * 1.10`
3. 프리미엄 밴드:
   - P20 = `vat_included * 1.20`
   - P30 = `vat_included * 1.30`
   - P40 = `vat_included * 1.40`
   - P50 = `vat_included * 1.50`

## 중고 마켓 평균 단가
- 당근/번개에서 **판매 매물만** 수집
- 제목/본문에 `매입`, `삽니다`, `구매합니다` 등 포함 시 제외 (관리자 설정 가능)
- 무게 파싱 성공 시 `price_per_kg`로 정규화
- 기간별(24h/7d/30d) 평균, 중위값, 분위수 제공
- `used_avg_krw_per_kg` → `used_avg_krw_per_oz` → `used_avg_usd_per_oz`로 시계열 저장

## 매입 판단 지표
- Used vs Spot 스프레드 (금액/비율)
- Used vs VAT+Premium 밴드 위치
- 공급량(키워드별 매물 수) 변화
- 거래소 간 괴리(SHFE vs DGCX vs Investing)

## 판매 사이트 3곳 VAT 제거 가격
- 대성금속 1kg: https://www.dsmint.com/sp2/goods_data_view.htm?goods_idx=653
- 국제표준 1kg: https://www.goodgold.co.kr/shop/item.php?it_id=1737685825
- 아시아골드 1kg: https://www.asiagold.co.kr/goods/goods_view.php?goodsNo=1000000071

`net_price_krw = gross_price_krw / 1.10`

## 조건 매입 탐색
- `buy_max_price_krw_per_kg` 상한
- `buy_target_discount_pct_vs_spot` 기준
- 판매 매물만 + 무게 파싱 성공 + 가격 조건 충족 시 알림

## 권장 아키텍처
- Backend: FastAPI 또는 NestJS
- Worker: Celery/BullMQ + Redis
- DB: PostgreSQL (시계열 저장)
- Frontend: Next.js + 차트 라이브러리
- 배포: Docker + VPS

## 핵심 테이블 (초안)
- futures_quotes
- fx_quotes
- spot_estimates
- premium_bands
- retail_site_prices
- market_listings
- used_market_stats
- keyword_counts
- alerts_sent

## 스케줄링 권장 주기
- 선물 3종: 10~30초 (가능하면) 또는 1분
- 환율: 1~5분
- 판매사이트 3곳: 1~3분
- 당근/번개: 키워드당 1~5분 (백오프/캐시 필수)
- 중고 평균/키워드 카운트: 5분 버킷

## MVP 단계
1. 3선물 + 환율 표준화
2. SpotEstimator(A) + 프리미엄 밴드
3. 판매사이트 3곳 gross/net
4. 당근/번개 수집 + 판매글만 + 1kg 정규화
5. 대시보드 + 텔레그램 알림

## 운영 주의
- Investing.com 데이터는 실시간/정확 보장 아님
- 마켓/사이트 수집은 호출 최소화 + 캐시 + 지연 + 백오프 + Provider 교체 구조 필수
