# TORK — FASULYE VE DOMUZ MASTER PROTOCOL
## ARCHITECTURE ANALYSIS & PHASE PLAN

---

## PART A: CURRENT STATE ANALYSIS

### Existing Database Tables

#### 1. profiles
```sql
id (uuid, PK)
email (text)
role (text) -- 'shipper' | 'carrier'
company_name (text)
phone (text)
created_at (timestamp)
```
**Status:** Has RLS, immutable identity guard, working auth

#### 2. loads
```sql
id (uuid, PK)
shipper_id (uuid, FK → profiles.id)
origin (text) -- currently plain string (e.g., "Trabzon Arsin OSB")
destination (text) -- currently plain string (e.g., "Ankara Sincan OSB")
tonnage (numeric)
vehicle_type (text) -- current values: TIR, Kamyon, Frigo, Kırkayak
status (text) -- CHECK: 'open' | 'assigned' | 'completed'
created_at (timestamp)
```
**Status:** Has RLS, immutable owner guard, basic form working

#### 3. bids
```sql
id (uuid, PK)
load_id (uuid, FK → loads.id)
carrier_id (uuid, FK → profiles.id)
amount (numeric)
status (text) -- CHECK: 'pending' | 'accepted' | 'rejected'
created_at (timestamp)
```
**Status:** Has RLS, immutable guard, set_bid_status RPC protected

#### 4. RPC Functions
- `current_user_role()` — fetches authenticated user role
- `set_bid_status(p_bid_id, p_new_status)` — shipper-only bid mutation

### Current Frontend Data Model

**Origin/Destination:** Plain text strings, no province/district abstraction
**Vehicle:** Dropdown selector, 4 hardcoded options
**Cargo:** Dropdown selector, 5 hardcoded cargo types
**Search:** No search/filter capability

### Current Authentication & Security
✅ Supabase auth working
✅ RLS enabled on all tables
✅ Immutable identity fields protected
✅ Shipper/Carrier role distinction working
✅ Bid status transitions via RPC only

---

## PART B: RISK ASSESSMENT

### High Risk Operations (STOP & REPORT)
1. ❌ Adding columns to loads (origin, destination become structured)
2. ❌ Adding columns to bids (tracking new fields)
3. ❌ Changing CHECK constraints on status fields
4. ❌ Modifying RLS policies
5. ❌ Creating new tables without migration

### Medium Risk Operations (PLAN & ASK)
1. ⚠️ Creating new data tables (turkeyProvinces, turkeyDistricts)
2. ⚠️ Adding new status values (need UI mapping only)
3. ⚠️ New cargo/vehicle types (frontend only)

### Low Risk Operations (CAN PROCEED)
1. ✅ UI/Component changes
2. ✅ Frontend validation
3. ✅ State management changes
4. ✅ Search/filter logic
5. ✅ New reusable components
6. ✅ Data files (turkeyProvinces.js, etc.)

---

## PART C: ARCHITECTURE DECISIONS

### Origin/Destination Strategy

**Current State:**
```javascript
origin: "Trabzon Arsin OSB" (plain string)
destination: "Ankara Sincan OSB" (plain string)
```

**Phase 1-3 Approach:** UI-FIRST ABSTRACTION
```javascript
origin: {
  province: "Trabzon",
  district: "Ortahisar"
}
destination: {
  province: "Ankara",
  district: "Çankaya"
}
```

But store in database as **DISPLAY** strings:
```sql
origin = "Trabzon / Ortahisar"
destination = "Ankara / Çankaya"
```

This keeps existing database schema intact while providing structured UI.

### Vehicle Classification Strategy

**Current:** 4 hardcoded options in dropdown

**New:** Create helper data structure
```javascript
src/data/vehicleTypes.js

{
  category,
  type,
  aliases,
  maxTonnage,
  commonUseCases
}
```

Use existing `vehicle_type` column for display names.

### Cargo Type Strategy

**Current:** 5 hardcoded cargo types

**New:** Enhance with metadata
```javascript
src/data/cargoTypes.js

{
  code,
  name,
  handlingRequirements,
  specialCases
}
```

Use existing table schema.

### Future Database Extensibility

Create tables (NOT YET):
```sql
provinces (id, code, name, region)
districts (id, province_id, code, name)
routes (id, origin_province, origin_district, dest_province, dest_district)
loads_extended (load_id, origin_struct, dest_struct, detailed_cargo)
```

But store as migration plan, not implement yet.

---

## PART D: COMPONENT ARCHITECTURE

### New Components (Phase 1-10)

```
ProvinceSelect
├── Search input
├── Autocomplete list
├── Keyboard nav
└── Accessibility

DistrictSelect
├── Dependent on province
├── Cascading load
└── Same UX as Province

RouteSelector
├── ProvinceSelect (origin)
├── DistrictSelect (origin)
├── RoutePreview
├── ProvinceSelect (destination)
├── DistrictSelect (destination)
└── Validation

RoutePreview
├── Origin marker
├── Destination marker
├── Route line
└── Optional distance/duration

VehicleSelect
├── Category tabs
├── Type cards
├── Specifications
└── Selection state

BidComparison
├── Amount sorted list
├── Carrier info
├── Time submitted
└── Status badges

NotificationCenter
├── Notification list
├── Unread count
├── Dismiss
└── Mark as read

ActivityTimeline
├── Event list
├── Timestamps
├── Event icons
└── Status indicators
```

---

## PART E: DATA FILES (Frontend Only)

### turkeyProvinces.js
```javascript
{
  code,      // 34 (İstanbul), 06 (Ankara), etc.
  name,      // "İstanbul", "Ankara"
  region,    // "Marmara", "Central"
  latitude,  // future
  longitude  // future
}
```
81 provinces + searchable index

### turkeyDistricts.js
```javascript
{
  provinceCode,  // "34"
  code,          // "34001" (İstanbul Adalar)
  name           // "Adalar"
}
```
900+ districts + searchable index

### vehicleTypes.js
Data structure for vehicle categories, selection UI

### cargoTypes.js
Enhanced cargo type definitions

---

## PART F: STATE MANAGEMENT

### New Frontend State (No DB)
```javascript
// Route selection
[originProvince, setOriginProvince]
[originDistrict, setOriginDistrict]
[destinationProvince, setDestinationProvince]
[destinationDistrict, setDestinationDistrict]

// Validation
[routeError, setRouteError]
[cargoError, setCargoError]

// UI
[showProvinceSearch, setShowProvinceSearch]
[filteredProvinces, setFilteredProvinces]

// Load form extended
[loadingDetails, setLoadingDetails]
[loadTiming, setLoadTiming]
[loadPricing, setLoadPricing]
```

### Derived State
```javascript
// From selection, derive display strings for DB
const originDisplay = `${originProvince} / ${originDistrict}`
const destinationDisplay = `${destinationProvince} / ${destinationDistrict}`
```

---

## PART G: PHASING STRATEGY

### Phase 1: TURKEY LOCATION SYSTEM (Frontend Only)
- Create turkeyProvinces.js (81 provinces)
- Create ProvinceSelect component
- Integrate into Create Load Step 1
- Add keyboard navigation
- Test search/autocomplete

### Phase 2: DISTRICT SYSTEM (Frontend Only)
- Create turkeyDistricts.js (900+ districts)
- Create DistrictSelect component (cascading)
- Integrate into Create Load Step 1
- Validation: origin != destination

### Phase 3: ORIGIN/DESTINATION ENGINE (Frontend Only)
- Create RouteSelector wrapper component
- Create RoutePreview component
- Replace old origin/destination string inputs
- Display: "Trabzon / Ortahisar → Ankara / Çankaya"
- Store in DB as display string (no schema change)

### Phase 4: ROUTE INTELLIGENCE (Frontend Only)
- Add distance/duration slots to RoutePreview
- Create mock/placeholder values
- NO fake distance generation
- Prepare for future map API integration

### Phase 5: LOAD CREATION UPGRADE (Frontend + Minor DB)
- Extend Create Load form to 7 steps
- Add TIMING section (dates, time windows)
- Add PRICING section (notes on pricing)
- NO database schema changes yet
- State only

### Phase 6: VEHICLE INTELLIGENCE (Frontend Only)
- Categorize vehicle types
- Create VehicleSelect with cards
- Add special handling indicators
- Keep vehicle_type field unchanged

### Phase 7-10: BID/SEARCH/NOTIFICATION (Frontend Only)
- Enhanced bid comparison UI
- Search & filters for loads
- Notification center mock
- Activity timeline

### Phase 11+: REQUIRES DATABASE
- Will STOP and report required migrations

---

## PART H: REGRESSION TEST CHECKLIST

Each phase must pass:

- [ ] Signup/Login/Logout
- [ ] Create Load (form still submits)
- [ ] Browse Loads (view still works)
- [ ] Send Bid (insertion works)
- [ ] Accept/Reject Bid (RPC still works)
- [ ] Profile Update (save works)
- [ ] Settings Save
- [ ] Existing design system intact
- [ ] No console errors
- [ ] Build succeeds

---

## PART I: DATABASE ISOLATION PLAN

**RULE:** Frontend features NEVER require database changes until explicitly approved.

If feature needs DB change:
1. Identify exact table/column
2. Check if existing column can be repurposed
3. If not: STOP and report
4. Do NOT auto-migrate

Examples:

❌ **WRONG:**
```javascript
// Frontend deciding to add column
ALTER TABLE loads ADD COLUMN origin_province text;
```

✅ **RIGHT:**
```javascript
// Detect need, report to user
console.log("REQUIRES: origin_province column on loads table")
// Provide migration example
```

---

## NEXT STEP: PHASE 1 DETAILED IMPLEMENTATION

Proceed with Phase 1 only after this plan is approved.

Phase 1 Deliverables:
- turkeyProvinces.js (81 entries)
- ProvinceSelect.jsx component
- Integration into Create Load
- Test plan
- Regression check
- Build success
