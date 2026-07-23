---
name: fsd-component-convention
description: React/Next.js/TypeScript component and custom hook writing conventions based on FSD (Feature-Sliced Design) architecture (#region structure, Self-Documenting Code, readability-first naming, layer unidirectional dependency rules, Named Export, Biome formatting, JSX rendering optimization). Use when creating new .tsx/.ts files or hooks, or refactoring existing ones.
---

# FSD-based Component & Custom Hook Writing Conventions

Write code as a Senior Frontend Engineer adhering to strict code conventions, type safety, readability, and FSD (Feature-Sliced Design) architecture rules.

> **💡 Core Philosophy: Self-Documenting Code & Readability First**  
> Code must serve as **clear documentation itself** without relying on extra explanations or comments.  
> Strictly avoid ambiguous abbreviations or single-letter variable names. Ensure variable and function names intuitively convey their purpose, operational logic, and return types (e.g., Boolean predicates).

---

## 1. 📖 Self-Documenting Code & Naming Guidelines

1. **Readability First Principle**: The code's intent and business logic flow should be understood immediately without reading comments.
2. **Explicit & Descriptive Naming**:
   - **No Abbreviations**: Strictly forbid ambiguous names like `p`, `data`, `res`, `btn`, `val`, `temp`. (e.g., `product` O / `p` X, `response` O / `res` X, `submitButton` O / `btn` X).
   - **Function Naming**: Use `verb + noun/object` format (`calculateDcaProfitRatio`, `fetchLatestBitcoinPrice`).
   - **Boolean Predicates**: Always include prefixes like `is/has/can/should/will` (`isHighPriceThresholdReached`, `hasDiscountCoupon`, `shouldRenderHeader`).
   - **Event Handlers**: Strictly follow `on + [Action] + [Target]` format (`onClickSubmitButton`, `onChangeSearchKeywordInput`).
3. **Specify Units & Domain Context**: Explicitly include units or currency standards in price and time variables (`priceInKrw`, `timeoutInMilliseconds`, `satsPerByte`).

---

## 2. 🏗️ FSD (Feature-Sliced Design) Architecture Rules

### 2.1 Layer Hierarchy & Unidirectional Dependency
Upper layers can **only import lower layers**. Direct cross-imports within the same layer or reverse imports from lower to upper layers are strictly forbidden.

```
app (top)
 └── views (replaces FSD pages)
      └── widgets
           └── features
                └── entities
                     └── shared (bottom)
```

- **`app`**: Next.js App Router (Routing entrypoints, API routes, global providers)
- **`views`**: Route-specific complete page assemblies (Named `views` to avoid confusion with `app/` and legacy `pages/`)
- **`widgets`**: Independent UI blocks (Header, BottomNavigation, MarketSummarySection, etc.)
- **`features`**: User actions and business functionality units (download-meme, calculate-dca, search-bip39, etc.)
- **`entities`**: Domain entity models, types, Zustand/TanStack-Query state (bitcoin, block, quiz, meme, etc.)
- **`shared`**: Domain-agnostic shared modules (UI kit, lib, util, global stores, config, etc.)

### 2.2 Public API (Index Barrel) & RSC Boundaries
1. **Barrel Files (`index.ts`)**: Each slice must encapsulate its external API (components, hooks, types) via `index.ts`. Avoid deep path imports (`@/entities/bitcoin/model/store`) and import from public barrels (`@/entities/bitcoin`).
2. **Server/Client Boundary**: In React Server Components (RSC), separate client-side logic or secret-dependent code using `client.ts` and `server.ts` to prevent crossing RSC boundaries.

---

## 3. 🎨 Syntax & Formatting

- **Biome Formatter**: Indent 2 spaces, JS/TS single quotes (`'`), JSX double quotes (`"`), mandatory semicolons.
- **No Single-Line Control Statements**: Always use `{}` blocks even for single-line `if` statements.
- **Single Variable Declarations**: Declare only one variable per line.
- **switch**: Always include `default:` and throw `new Error(...)` for unreachable cases.
- **No Variable Shadowing**: Do not create inner scope variables matching outer scope names.
- **Acronyms**: Uppercase trailing acronyms (`productID`, `httpCode`).
- **Named Export**: Use **Named Export** (`export function ...` / `export function use...`) for all components/modules except Next.js routing files (`page.tsx`, `layout.tsx`).

---

## 4. 📁 Files & Naming

| Target | Convention | Example |
|---|---|---|
| Component File | `PascalCase.tsx` | `BitcoinPriceCard.tsx` |
| Hook File | `camelCase.ts` / `camelCase.tsx` | `useBitcoinPrice.ts` |
| Type Definition File | `kebab-case.d.ts` | `bitcoin-market.d.ts` |
| Schema File | `kebab-case.schema.ts` | `bip39-search.schema.ts` |
| Directory / Slice | `kebab-case` or `camelCase` | `orange-pill`, `bitcoin` |

---

## 5. 🧩 Component & Custom Hook Structure (`//#region`)

Organize component and hook internals into 6 distinct `#region` blocks:

1. `//#region [Hooks]` — React Hooks, Custom Hooks, Zustand, TanStack Query
2. `//#region [Privates]` — Pure business/domain logic functions & render guard functions
   - **CRITICAL**: Name functions with extreme clarity so internal logic is understood immediately (`verb + noun`, `is/has/can/should` for Booleans).
3. `//#region [Events]` — DOM and element event handlers
   - **Naming Convention**: `on + [Action] + [Target]` (`onClickSubmitButton`, `onChangeSearchInput`).
   - **CRITICAL**: Prohibit inline anonymous functions. Wrap `Privates` functions inside `Events` functions instead of assigning `Privates` directly to event props.
4. `//#region [Transactions]` — Direct API invocation & async handling functions
5. `//#region [Life Cycles]` — `useEffect`, `useLayoutEffect`
   - **CRITICAL**: Prohibit direct business logic inside `useEffect`. Keep only `if` guards and calls to `Privates` functions.
6. `//#region [Templates]` — UI/JSX computed operations, complex condition evaluations, Sub-JSX templates
   - **CRITICAL**: Sub-JSX and template variables MUST use `PascalCase` (`WarningBadgeTemplate`). Simple Boolean variables use `camelCase` (`shouldRenderSlideLogoHeader`).
   - **CRITICAL**: Avoid chaining 3+ conditions with `&&` in JSX (`!a && !b && c`). Extract them into single Boolean flags or `PascalCase` templates using `useMemo` in `[Templates]`.
   - **CRITICAL**: Inside JSX `return`, prohibit inline calculations, anonymous functions, and nested ternary operators (except `.map()` key/props).

> **Flexibility Rule**
> Default order: `[Hooks]` → `[Privates]` → `[Events]` → `[Transactions]` → `[Life Cycles]` → `[Templates]`.
> Order may be adjusted based on function call dependencies and readability.

---

## 6. 🔍 Biome Static Analysis & Self-Validation Process

After creating or modifying code, verify clean state without lint/format errors:
1. `pnpm check` or `pnpm biome check --write <filePath>`
2. `pnpm check:cycles` (Check for FSD circular dependencies)

---

## 7. 💻 Code Examples

### Good ✅ (Self-Documenting + FSD + #region Structure)

```tsx
import { type ReactNode, useEffect, useMemo, useState } from 'react';
// Unidirectional import from lower FSD layers (shared, entities)
import { useBitcoinPriceStore } from '@/entities/bitcoin';
import { Button } from '@/shared/ui';

interface BitcoinPriceCardProps {
  exchangeName: string;
}

export function BitcoinPriceCard({ exchangeName }: BitcoinPriceCardProps): ReactNode {
  //#region [Hooks]
  const { currentPriceInKrw, fetchLatestBitcoinPrice } = useBitcoinPriceStore();
  const [isPriceAlertNotificationEnabled, setIsPriceAlertNotificationEnabled] = useState<boolean>(false);
  //#endregion

  //#region [Privates]
  const isHighPriceThresholdReached = (priceInKrw: number): boolean => {
    const ONE_HUNDRED_MILLION_KRW = 100_000_000;
    return priceInKrw >= ONE_HUNDRED_MILLION_KRW;
  };

  const handleHighPriceNotificationAlert = (): void => {
    if (isPriceAlertNotificationEnabled) {
      window.alert('Bitcoin price has reached 100 Million KRW or higher!');
    }
  };
  //#endregion

  //#region [Events]
  const onClickToggleAlertNotificationButton = (): void => {
    setIsPriceAlertNotificationEnabled((previousNotificationState) => {
      return !previousNotificationState;
    });
  };

  const onClickRefreshBitcoinPriceButton = (): void => {
    fetchLatestBitcoinPrice();
  };
  //#endregion

  //#region [Life Cycles]
  useEffect(() => {
    if (isHighPriceThresholdReached(currentPriceInKrw)) {
      handleHighPriceNotificationAlert();
    }
  }, [currentPriceInKrw]);
  //#endregion

  //#region [Templates]
  const shouldRenderHighPriceBadge = useMemo(() => {
    return isHighPriceThresholdReached(currentPriceInKrw);
  }, [currentPriceInKrw]);

  const HighPriceBadgeTemplate = useMemo(() => {
    if (!shouldRenderHighPriceBadge) {
      return null;
    }

    return <span className="text-red-500 font-bold">100M KRW Reached!</span>;
  }, [shouldRenderHighPriceBadge]);
  //#endregion

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg">
      <h3 className="text-lg font-bold">{exchangeName} Bitcoin Price</h3>
      <p className="text-2xl font-extrabold">{currentPriceInKrw.toLocaleString()} KRW</p>

      {HighPriceBadgeTemplate}

      <div className="flex gap-2">
        <Button type="button" onClick={onClickRefreshBitcoinPriceButton}>
          Refresh Price
        </Button>
        <Button type="button" onClick={onClickToggleAlertNotificationButton}>
          {isPriceAlertNotificationEnabled ? 'Disable Alert' : 'Enable Alert'}
        </Button>
      </div>
    </div>
  );
}
```

### Bad ❌ (Abbreviations & Poor Readability & FSD Violations)

```tsx
// BAD: Import from upper/same layer or deep import
import { MemeDownloadButton } from '@/features/download-meme/ui/MemeDownloadButton';

const BitcoinPriceCard = ({ exchangeName }) => {
  const [p, setP] = useState(0); // BAD: Abbreviation p
  const [flag, setFlag] = useState(false); // BAD: Ambiguous flag name

  useEffect(() => {
    // BAD: Direct logic and fetch inside useEffect
    fetch('/api/btc').then(res => res.json()).then(d => setP(d.price));
  }, []);

  if (!p) return <div>Loading...</div>; // BAD: Single-line control without {}

  return (
    <div>
      {/* BAD: Inline complex condition & anonymous function */}
      {p > 100000000 && flag && <span>ATH!</span>}
      <button onClick={() => setP(0)}>Reset</button>
    </div>
  );
};

export default BitcoinPriceCard; // BAD: Default export
```
