--
-- PostgreSQL database dump
--

\restrict FPJt2Am4WVcYYjNbtPZV0UQNTq420aLk9PlsifNuwCLK7jR0S3q54meOa2H0iO8

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: condosync
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO condosync;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: condosync
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AssemblyStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."AssemblyStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'FINISHED',
    'CANCELED'
);


ALTER TYPE public."AssemblyStatus" OWNER TO condosync;

--
-- Name: ChargeStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."ChargeStatus" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'CANCELED'
);


ALTER TYPE public."ChargeStatus" OWNER TO condosync;

--
-- Name: FinancialTransactionType; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."FinancialTransactionType" AS ENUM (
    'INCOME',
    'EXPENSE'
);


ALTER TYPE public."FinancialTransactionType" OWNER TO condosync;

--
-- Name: GatewayType; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."GatewayType" AS ENUM (
    'NONE',
    'ASAAS',
    'PJBANK'
);


ALTER TYPE public."GatewayType" OWNER TO condosync;

--
-- Name: LostAndFoundStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."LostAndFoundStatus" AS ENUM (
    'LOST',
    'FOUND',
    'RETURNED',
    'DISCARDED'
);


ALTER TYPE public."LostAndFoundStatus" OWNER TO condosync;

--
-- Name: MarketplaceOfferStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."MarketplaceOfferStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'EXPIRED'
);


ALTER TYPE public."MarketplaceOfferStatus" OWNER TO condosync;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."NotificationType" AS ENUM (
    'VISITOR',
    'PARCEL',
    'MAINTENANCE',
    'FINANCIAL',
    'COMMUNICATION',
    'RESERVATION',
    'OCCURRENCE',
    'ASSEMBLY'
);


ALTER TYPE public."NotificationType" OWNER TO condosync;

--
-- Name: OccurrenceStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."OccurrenceStatus" AS ENUM (
    'OPEN',
    'IN_ANALYSIS',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."OccurrenceStatus" OWNER TO condosync;

--
-- Name: ParcelStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."ParcelStatus" AS ENUM (
    'RECEIVED',
    'NOTIFIED',
    'PICKED_UP',
    'RETURNED'
);


ALTER TYPE public."ParcelStatus" OWNER TO condosync;

--
-- Name: RenovationStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."RenovationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED'
);


ALTER TYPE public."RenovationStatus" OWNER TO condosync;

--
-- Name: ReservationStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."ReservationStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELED',
    'COMPLETED'
);


ALTER TYPE public."ReservationStatus" OWNER TO condosync;

--
-- Name: ServiceOrderPriority; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."ServiceOrderPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."ServiceOrderPriority" OWNER TO condosync;

--
-- Name: ServiceOrderStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."ServiceOrderStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'WAITING_PARTS',
    'COMPLETED',
    'CANCELED'
);


ALTER TYPE public."ServiceOrderStatus" OWNER TO condosync;

--
-- Name: ShiftType; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."ShiftType" AS ENUM (
    'MORNING',
    'AFTERNOON',
    'NIGHT',
    'FULL_DAY'
);


ALTER TYPE public."ShiftType" OWNER TO condosync;

--
-- Name: StockMovementType; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."StockMovementType" AS ENUM (
    'IN',
    'OUT',
    'ADJUSTMENT'
);


ALTER TYPE public."StockMovementType" OWNER TO condosync;

--
-- Name: TicketCategory; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."TicketCategory" AS ENUM (
    'manutencao',
    'financeiro',
    'barulho',
    'seguranca',
    'outro'
);


ALTER TYPE public."TicketCategory" OWNER TO condosync;

--
-- Name: TicketPriority; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."TicketPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."TicketPriority" OWNER TO condosync;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'CLOSED'
);


ALTER TYPE public."TicketStatus" OWNER TO condosync;

--
-- Name: UnitStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."UnitStatus" AS ENUM (
    'OCCUPIED',
    'VACANT',
    'UNDER_RENOVATION',
    'BLOCKED'
);


ALTER TYPE public."UnitStatus" OWNER TO condosync;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'CONDOMINIUM_ADMIN',
    'SYNDIC',
    'DOORMAN',
    'RESIDENT',
    'SERVICE_PROVIDER',
    'COUNCIL_MEMBER'
);


ALTER TYPE public."UserRole" OWNER TO condosync;

--
-- Name: VehicleType; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."VehicleType" AS ENUM (
    'CAR',
    'MOTORCYCLE',
    'TRUCK',
    'BICYCLE',
    'OTHER'
);


ALTER TYPE public."VehicleType" OWNER TO condosync;

--
-- Name: VisitorStatus; Type: TYPE; Schema: public; Owner: condosync
--

CREATE TYPE public."VisitorStatus" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'DENIED',
    'INSIDE',
    'LEFT'
);


ALTER TYPE public."VisitorStatus" OWNER TO condosync;

--
-- Name: validate_condominium_user_unit(); Type: FUNCTION; Schema: public; Owner: condosync
--

CREATE FUNCTION public.validate_condominium_user_unit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW."unitId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "units" u
    WHERE u."id" = NEW."unitId"
      AND u."condominiumId" = NEW."condominiumId"
  ) THEN
    RAISE EXCEPTION 'Unit does not belong to condominium';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_condominium_user_unit() OWNER TO condosync;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO condosync;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.announcements (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "authorId" text NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "isOfficial" boolean DEFAULT false NOT NULL,
    attachments text[],
    "targetRoles" public."UserRole"[],
    "publishedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.announcements OWNER TO condosync;

--
-- Name: area_blocked_periods; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.area_blocked_periods (
    id text NOT NULL,
    "commonAreaId" text NOT NULL,
    reason text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.area_blocked_periods OWNER TO condosync;

--
-- Name: assemblies; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.assemblies (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    description text,
    "meetingUrl" text,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "finishedAt" timestamp(3) without time zone,
    "minutesUrl" text,
    status public."AssemblyStatus" DEFAULT 'SCHEDULED'::public."AssemblyStatus" NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.assemblies OWNER TO condosync;

--
-- Name: assembly_attendees; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.assembly_attendees (
    id text NOT NULL,
    "assemblyId" text NOT NULL,
    "userId" text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "leftAt" timestamp(3) without time zone
);


ALTER TABLE public.assembly_attendees OWNER TO condosync;

--
-- Name: assembly_votes; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.assembly_votes (
    id text NOT NULL,
    "votingItemId" text NOT NULL,
    "userId" text NOT NULL,
    "optionId" text NOT NULL,
    "votedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.assembly_votes OWNER TO condosync;

--
-- Name: assembly_voting_items; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.assembly_voting_items (
    id text NOT NULL,
    "assemblyId" text NOT NULL,
    title text NOT NULL,
    description text,
    options jsonb NOT NULL
);


ALTER TABLE public.assembly_voting_items OWNER TO condosync;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    "condominiumId" text,
    action text NOT NULL,
    module text NOT NULL,
    "entityType" text,
    "entityId" text,
    description text NOT NULL,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO condosync;

--
-- Name: charges; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.charges (
    id text NOT NULL,
    "unitId" text NOT NULL,
    "accountId" text NOT NULL,
    "categoryId" text,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paidAmount" numeric(12,2),
    status public."ChargeStatus" DEFAULT 'PENDING'::public."ChargeStatus" NOT NULL,
    "referenceMonth" text,
    "gatewayId" text,
    "gatewayStatus" text,
    "pixQrCode" text,
    "pixCopyPaste" text,
    "paymentLink" text,
    "boletoUrl" text,
    "boletoCode" text,
    "penaltyAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "interestRate" numeric(5,4) DEFAULT 0 NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.charges OWNER TO condosync;

--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.chat_conversations (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    "unitId" text,
    subject text,
    participants text[],
    "isOpen" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.chat_conversations OWNER TO condosync;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.chat_messages (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "senderId" text NOT NULL,
    content text NOT NULL,
    attachments text[],
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO condosync;

--
-- Name: collection_rules; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.collection_rules (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.collection_rules OWNER TO condosync;

--
-- Name: collection_steps; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.collection_steps (
    id text NOT NULL,
    "ruleId" text NOT NULL,
    "daysAfterDue" integer NOT NULL,
    channels text[],
    "messageTemplate" text NOT NULL,
    action text DEFAULT 'notify'::text NOT NULL
);


ALTER TABLE public.collection_steps OWNER TO condosync;

--
-- Name: common_areas; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.common_areas (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    description text,
    capacity integer,
    rules text,
    "photoUrls" text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "requiresApproval" boolean DEFAULT false NOT NULL,
    "maxDaysAdvance" integer DEFAULT 30 NOT NULL,
    "openTime" text,
    "closeTime" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.common_areas OWNER TO condosync;

--
-- Name: condominium_contracts; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.condominium_contracts (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    vendor text NOT NULL,
    "contractType" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    value numeric(12,2) NOT NULL,
    "adjustmentIndex" text,
    "fileUrl" text,
    notes text,
    "autoRenew" boolean DEFAULT false NOT NULL,
    "alertDaysBefore" integer DEFAULT 60 NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.condominium_contracts OWNER TO condosync;

--
-- Name: condominium_documents; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.condominium_documents (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    "fileName" text NOT NULL,
    "storedName" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    "uploadedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.condominium_documents OWNER TO condosync;

--
-- Name: condominium_users; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.condominium_users (
    id text NOT NULL,
    "userId" text NOT NULL,
    "condominiumId" text NOT NULL,
    role public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "unitId" text,
    CONSTRAINT condominium_users_resident_requires_unit CHECK (((role <> 'RESIDENT'::public."UserRole") OR ("unitId" IS NOT NULL)))
);


ALTER TABLE public.condominium_users OWNER TO condosync;

--
-- Name: condominiums; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.condominiums (
    id text NOT NULL,
    name text NOT NULL,
    cnpj text,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    "zipCode" text NOT NULL,
    phone text,
    email text,
    "logoUrl" text,
    timezone text DEFAULT 'America/Sao_Paulo'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    plan text DEFAULT 'basic'::text NOT NULL,
    "maxUnits" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.condominiums OWNER TO condosync;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.contracts (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    "serviceProviderId" text NOT NULL,
    title text NOT NULL,
    description text,
    value numeric(12,2) NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "documentUrl" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.contracts OWNER TO condosync;

--
-- Name: dependents; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.dependents (
    id text NOT NULL,
    "unitId" text NOT NULL,
    name text NOT NULL,
    relationship text NOT NULL,
    "birthDate" timestamp(3) without time zone,
    cpf text,
    "photoUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.dependents OWNER TO condosync;

--
-- Name: digital_signage_screens; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.digital_signage_screens (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    token text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "slideDuration" integer DEFAULT 8 NOT NULL,
    "primaryColor" text DEFAULT '#1e40af'::text NOT NULL,
    "logoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.digital_signage_screens OWNER TO condosync;

--
-- Name: digital_signage_slides; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.digital_signage_slides (
    id text NOT NULL,
    "screenId" text NOT NULL,
    type text NOT NULL,
    title text,
    content text,
    "imageUrl" text,
    "backgroundColor" text,
    "textColor" text,
    "order" integer DEFAULT 0 NOT NULL,
    duration integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "validFrom" timestamp(3) without time zone,
    "validUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.digital_signage_slides OWNER TO condosync;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.employees (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    cpf text NOT NULL,
    role text NOT NULL,
    phone text,
    email text,
    shift public."ShiftType" NOT NULL,
    "admissionDate" timestamp(3) without time zone NOT NULL,
    "salaryAmount" numeric(10,2),
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text
);


ALTER TABLE public.employees OWNER TO condosync;

--
-- Name: finalized_assemblies; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.finalized_assemblies (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "minutesUrl" text,
    "condominiumId" text NOT NULL
);


ALTER TABLE public.finalized_assemblies OWNER TO condosync;

--
-- Name: financial_accounts; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.financial_accounts (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    "bankName" text,
    agency text,
    "accountNumber" text,
    balance numeric(12,2) DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "gatewayType" public."GatewayType" DEFAULT 'NONE'::public."GatewayType" NOT NULL,
    "gatewayKey" text,
    "gatewayConfig" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.financial_accounts OWNER TO condosync;

--
-- Name: financial_categories; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.financial_categories (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    type public."FinancialTransactionType" NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.financial_categories OWNER TO condosync;

--
-- Name: financial_transactions; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.financial_transactions (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "categoryId" text,
    type public."FinancialTransactionType" NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "referenceMonth" text,
    "receiptUrl" text,
    notes text,
    "createdBy" text NOT NULL,
    "chargeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.financial_transactions OWNER TO condosync;

--
-- Name: fines; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.fines (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    "unitId" text NOT NULL,
    "reportedBy" text NOT NULL,
    description text NOT NULL,
    regulation text NOT NULL,
    "photoUrls" text[],
    amount numeric(10,2) NOT NULL,
    "appealDeadline" timestamp(3) without time zone NOT NULL,
    "appealText" text,
    "appealedAt" timestamp(3) without time zone,
    "appealStatus" text,
    "appealResponse" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "chargeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.fines OWNER TO condosync;

--
-- Name: lost_and_found; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.lost_and_found (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    place text,
    status public."LostAndFoundStatus" DEFAULT 'FOUND'::public."LostAndFoundStatus" NOT NULL,
    "photoUrl" text,
    "foundDate" timestamp(3) without time zone,
    "lostDate" timestamp(3) without time zone,
    "returnedAt" timestamp(3) without time zone,
    "returnedTo" text,
    "condominiumId" text NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.lost_and_found OWNER TO condosync;

--
-- Name: maintenance_schedules; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.maintenance_schedules (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    location text NOT NULL,
    frequency text NOT NULL,
    "nextDueDate" timestamp(3) without time zone NOT NULL,
    "lastDoneDate" timestamp(3) without time zone,
    "estimatedCost" numeric(10,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.maintenance_schedules OWNER TO condosync;

--
-- Name: marketplace_offers; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.marketplace_offers (
    id text NOT NULL,
    "partnerId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    discount text,
    "couponCode" text,
    "validUntil" timestamp(3) without time zone,
    status public."MarketplaceOfferStatus" DEFAULT 'ACTIVE'::public."MarketplaceOfferStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.marketplace_offers OWNER TO condosync;

--
-- Name: marketplace_partners; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.marketplace_partners (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "logoUrl" text,
    website text,
    phone text,
    email text,
    category text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.marketplace_partners OWNER TO condosync;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO condosync;

--
-- Name: occurrences; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.occurrences (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    "reportedBy" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    location text,
    "photoUrls" text[],
    status public."OccurrenceStatus" DEFAULT 'OPEN'::public."OccurrenceStatus" NOT NULL,
    priority public."ServiceOrderPriority" DEFAULT 'MEDIUM'::public."ServiceOrderPriority" NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedBy" text,
    resolution text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.occurrences OWNER TO condosync;

--
-- Name: panic_alerts; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.panic_alerts (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    "triggeredBy" text NOT NULL,
    "resolvedBy" text,
    "resolvedAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.panic_alerts OWNER TO condosync;

--
-- Name: parcels; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.parcels (
    id text NOT NULL,
    "unitId" text NOT NULL,
    "senderName" text,
    carrier text,
    "trackingCode" text,
    "photoUrl" text,
    "storageLocation" text,
    status public."ParcelStatus" DEFAULT 'RECEIVED'::public."ParcelStatus" NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "notifiedAt" timestamp(3) without time zone,
    "pickedUpAt" timestamp(3) without time zone,
    "pickedUpBy" text,
    "pickupSignature" text,
    notes text,
    "registeredBy" text,
    "deliveryPersonDoc" text,
    "deliveryPersonName" text,
    "hasPackageDamage" boolean DEFAULT false NOT NULL,
    "vehiclePlate" text
);


ALTER TABLE public.parcels OWNER TO condosync;

--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.password_resets (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.password_resets OWNER TO condosync;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    description text
);


ALTER TABLE public.permissions OWNER TO condosync;

--
-- Name: pets; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.pets (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    breed text,
    size text,
    gender text,
    "birthDate" timestamp(3) without time zone,
    color text,
    "photoUrl" text,
    weight double precision,
    "lastVaccination" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "unitId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.pets OWNER TO condosync;

--
-- Name: photos; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.photos (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    "fileName" text NOT NULL,
    "storedName" text NOT NULL,
    "filePath" text NOT NULL,
    "fileSize" integer NOT NULL,
    "mimeType" text NOT NULL,
    "uploadedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.photos OWNER TO condosync;

--
-- Name: poll_votes; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.poll_votes (
    id text NOT NULL,
    "pollId" text NOT NULL,
    "userId" text NOT NULL,
    "optionIds" text[],
    "votedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.poll_votes OWNER TO condosync;

--
-- Name: polls; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.polls (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    description text,
    options jsonb NOT NULL,
    "allowMultiple" boolean DEFAULT false NOT NULL,
    "isAnonymous" boolean DEFAULT false NOT NULL,
    "startsAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    "createdBy" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.polls OWNER TO condosync;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO condosync;

--
-- Name: renovation_providers; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.renovation_providers (
    id text NOT NULL,
    "renovationId" text NOT NULL,
    name text NOT NULL,
    "serviceType" text NOT NULL,
    document text,
    phone text,
    company text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.renovation_providers OWNER TO condosync;

--
-- Name: renovations; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.renovations (
    id text NOT NULL,
    "unitId" text NOT NULL,
    "condominiumId" text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    status public."RenovationStatus" DEFAULT 'PENDING'::public."RenovationStatus" NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedReason" text,
    notes text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.renovations OWNER TO condosync;

--
-- Name: reservations; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.reservations (
    id text NOT NULL,
    "commonAreaId" text NOT NULL,
    "unitId" text NOT NULL,
    "requestedBy" text NOT NULL,
    title text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "guestCount" integer,
    status public."ReservationStatus" DEFAULT 'PENDING'::public."ReservationStatus" NOT NULL,
    "approvedBy" text,
    "canceledBy" text,
    "cancelReason" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.reservations OWNER TO condosync;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.role_permissions (
    id text NOT NULL,
    role public."UserRole" NOT NULL,
    "permissionId" text NOT NULL,
    "condominiumId" text
);


ALTER TABLE public.role_permissions OWNER TO condosync;

--
-- Name: service_order_checklists; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.service_order_checklists (
    id text NOT NULL,
    "serviceOrderId" text NOT NULL,
    item text NOT NULL,
    "isDone" boolean DEFAULT false NOT NULL,
    "doneAt" timestamp(3) without time zone,
    notes text
);


ALTER TABLE public.service_order_checklists OWNER TO condosync;

--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.service_orders (
    id text NOT NULL,
    "unitId" text,
    "condominiumId" text NOT NULL,
    "requestedBy" text NOT NULL,
    "assignedTo" text,
    "serviceProviderId" text,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    location text,
    priority public."ServiceOrderPriority" DEFAULT 'MEDIUM'::public."ServiceOrderPriority" NOT NULL,
    status public."ServiceOrderStatus" DEFAULT 'OPEN'::public."ServiceOrderStatus" NOT NULL,
    "photoUrls" text[],
    "estimatedCost" numeric(10,2),
    "finalCost" numeric(10,2),
    "scheduledAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    resolution text,
    rating integer,
    feedback text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.service_orders OWNER TO condosync;

--
-- Name: service_providers; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.service_providers (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    cnpj text,
    cpf text,
    "serviceType" text NOT NULL,
    phone text NOT NULL,
    email text,
    "isApproved" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "photoUrl" text
);


ALTER TABLE public.service_providers OWNER TO condosync;

--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.stock_items (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    unit text NOT NULL,
    quantity double precision DEFAULT 0 NOT NULL,
    "minQuantity" double precision DEFAULT 0 NOT NULL,
    location text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stock_items OWNER TO condosync;

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.stock_movements (
    id text NOT NULL,
    "itemId" text NOT NULL,
    type public."StockMovementType" NOT NULL,
    quantity double precision NOT NULL,
    reason text,
    "performedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.stock_movements OWNER TO condosync;

--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.ticket_messages (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "senderId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_messages OWNER TO condosync;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.tickets (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    title text NOT NULL,
    category public."TicketCategory" DEFAULT 'outro'::public."TicketCategory" NOT NULL,
    priority public."TicketPriority" DEFAULT 'LOW'::public."TicketPriority" NOT NULL,
    status public."TicketStatus" DEFAULT 'OPEN'::public."TicketStatus" NOT NULL,
    "createdById" text NOT NULL,
    "assignedToId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tickets OWNER TO condosync;

--
-- Name: units; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.units (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    identifier text NOT NULL,
    block text,
    street text,
    floor text,
    type text,
    area double precision,
    bedrooms integer,
    status public."UnitStatus" DEFAULT 'OCCUPIED'::public."UnitStatus" NOT NULL,
    fraction numeric(8,6) DEFAULT 1.0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.units OWNER TO condosync;

--
-- Name: users; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    phone text,
    cpf text,
    "avatarUrl" text,
    role public."UserRole" DEFAULT 'RESIDENT'::public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO condosync;

--
-- Name: vehicle_access_logs; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.vehicle_access_logs (
    id text NOT NULL,
    "vehicleId" text,
    plate text NOT NULL,
    "unitId" text,
    "isResident" boolean DEFAULT false NOT NULL,
    "entryAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "exitAt" timestamp(3) without time zone,
    notes text,
    "registeredBy" text
);


ALTER TABLE public.vehicle_access_logs OWNER TO condosync;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.vehicles (
    id text NOT NULL,
    "unitId" text NOT NULL,
    plate text NOT NULL,
    brand text NOT NULL,
    model text NOT NULL,
    color text NOT NULL,
    year integer,
    type public."VehicleType" DEFAULT 'CAR'::public."VehicleType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "photoUrl" text
);


ALTER TABLE public.vehicles OWNER TO condosync;

--
-- Name: visitor_qrcode_uses; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.visitor_qrcode_uses (
    id text NOT NULL,
    "qrcodeId" text NOT NULL,
    "visitorId" text,
    "scannedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "scannedBy" text NOT NULL
);


ALTER TABLE public.visitor_qrcode_uses OWNER TO condosync;

--
-- Name: visitor_qrcodes; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.visitor_qrcodes (
    id text NOT NULL,
    "unitId" text NOT NULL,
    "createdBy" text NOT NULL,
    "visitorName" text NOT NULL,
    "visitorDoc" text,
    "visitorPhone" text,
    reason text,
    "validFrom" timestamp(3) without time zone NOT NULL,
    "validUntil" timestamp(3) without time zone NOT NULL,
    "maxUses" integer DEFAULT 1 NOT NULL,
    "usedCount" integer DEFAULT 0 NOT NULL,
    token text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.visitor_qrcodes OWNER TO condosync;

--
-- Name: visitor_recurrences; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.visitor_recurrences (
    id text NOT NULL,
    "condominiumId" text NOT NULL,
    "unitId" text NOT NULL,
    "visitorName" text NOT NULL,
    document text,
    "documentType" text,
    company text,
    reason text,
    "weekDays" text[] NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "validFrom" timestamp(3) without time zone NOT NULL,
    "validUntil" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.visitor_recurrences OWNER TO condosync;

--
-- Name: visitors; Type: TABLE; Schema: public; Owner: condosync
--

CREATE TABLE public.visitors (
    id text NOT NULL,
    "unitId" text NOT NULL,
    name text NOT NULL,
    document text,
    "documentType" text,
    phone text,
    "photoUrl" text,
    company text,
    reason text,
    "preAuthorizedBy" text,
    status public."VisitorStatus" DEFAULT 'PENDING'::public."VisitorStatus" NOT NULL,
    "scheduledAt" timestamp(3) without time zone,
    "entryAt" timestamp(3) without time zone,
    "exitAt" timestamp(3) without time zone,
    "registeredBy" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "serviceProviderId" text
);


ALTER TABLE public.visitors OWNER TO condosync;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
86b0c8ca-4147-452f-a6e5-560f66256fb2	ddfdf8edb5e554d7f4ff6d04c07ecfe1210287b5877978531f918302db9fe72f	2026-05-12 00:56:29.498137+00	20260311114401_init	\N	\N	2026-05-12 00:56:29.071946+00	1
4605f0fe-863f-442a-bf68-ae161be0b90f	7fc50c311b72e468ba993cee4b025fc7c77d68d3c69491cf74c9e88c9855c837	2026-05-12 00:56:29.561101+00	20260311141507_add_assemblies	\N	\N	2026-05-12 00:56:29.500756+00	1
d7efcb46-a35b-4936-98ba-0d55006081b8	151cf1c418a05c884fd75b74209757cb579a9a9fbecf96d1b0433df6380581a6	2026-05-12 00:56:29.588239+00	20260311152321_add_pets	\N	\N	2026-05-12 00:56:29.564404+00	1
84b2605a-22bd-4d42-8567-80bef31c2944	d296886805cc5b32674df730724d32b3fdebdc2b5f9814f99c555df79c70127b	2026-05-12 00:56:29.611825+00	20260311152727_add_lost_and_found	\N	\N	2026-05-12 00:56:29.590699+00	1
13395d90-fbe4-419a-8e36-63804204d23d	1b81ab5b562518551c2a2b521920b75b8946a18c8e1a7533165ac1916447f5ee	2026-05-12 00:56:29.632967+00	20260312123000_add_condominium_documents	\N	\N	2026-05-12 00:56:29.613862+00	1
842bac78-c712-4ee3-aaf0-3c925e3201e8	2f309137ad429821111a3336d35d48844a358539cb505c5f408c68434e3326fc	2026-05-12 00:56:29.651963+00	20260316120000_enforce_resident_unit_integrity	\N	\N	2026-05-12 00:56:29.635118+00	1
eb9673e0-6e4c-47f8-bb3e-734413713d56	69151728a83760e52d0278c7e20c3f5bc4b240590dddf7635408d04ec101862b	2026-05-12 00:56:29.700944+00	20260319190000_add_marketplace_panic_and_visitor_recurrence	\N	\N	2026-05-12 00:56:29.654491+00	1
6ba395f8-3fa2-498a-bf55-22353338a6a6	5baa97c053967c3cf78a1d140aaea0d5328087d3ffa99162716b9e8dcf99522d	2026-05-12 00:56:29.778031+00	20260401180300_add_missing_fields	\N	\N	2026-05-12 00:56:29.703649+00	1
ce02b1af-1d08-4e9d-afac-aa310feeb403	316c33a93c4b2d526d533b798fbdabc832d33403edd149dc31a33c1eac99f583	2026-05-12 00:56:36.222049+00	20260512005636_add_photo_fields_provider_vehicle	\N	\N	2026-05-12 00:56:36.125598+00	1
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.announcements (id, "condominiumId", title, content, "authorId", "isPinned", "isOfficial", attachments, "targetRoles", "publishedAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
c3d6f82b-2822-4003-910c-946d9bfcfcce	bf201f72-9858-4a6f-960e-c55260becb1d	Bem-vindos ao CondoSync!	O sistema de gest├úo do Residencial Veredas do Bosque est├í ativo. Utilizem o aplicativo para comunicados, reservas e chamados.	c7967c6e-846e-47fd-a747-b1e23bbed4b1	t	t	\N	\N	2026-05-12 01:10:34.642	\N	2026-05-12 01:10:34.642	2026-05-12 01:10:34.642
2496b231-6ac1-4088-a4ec-16693e0e2397	bf201f72-9858-4a6f-960e-c55260becb1d	Manuten├º├úo da bomba d'├ígua ÔÇö 15/03	Informamos que na pr├│xima segunda-feira, 15/03, ser├í realizada manuten├º├úo preventiva na bomba d'├ígua. O fornecimento poder├í ser interrompido das 8h ├ás 12h. Providenciem armazenamento pr├®vio.	c7967c6e-846e-47fd-a747-b1e23bbed4b1	t	t	\N	\N	2026-05-12 01:11:02.609	\N	2026-05-12 01:11:02.609	2026-05-12 01:11:02.609
dbf8a373-593b-46e6-8747-247275e7c4f1	bf201f72-9858-4a6f-960e-c55260becb1d	Elei├º├úo de conselho fiscal ÔÇö 20/03	Convocamos todos os cond├┤minos para a elei├º├úo dos membros do conselho fiscal no dia 20/03 ├ás 19h no sal├úo de festas. Sua participa├º├úo ├® fundamental!	c7967c6e-846e-47fd-a747-b1e23bbed4b1	t	t	\N	\N	2026-05-12 01:11:02.613	\N	2026-05-12 01:11:02.613	2026-05-12 01:11:02.613
b3259b60-3a16-4a00-badb-cb3600d2dd05	bf201f72-9858-4a6f-960e-c55260becb1d	Novas regras para pet no espa├ºo comum	A partir de abril, animais de estima├º├úo poder├úo circular nas ├íreas comuns somente com coleira e guia. Excrementos devem ser recolhidos pelo respons├ível.	c7967c6e-846e-47fd-a747-b1e23bbed4b1	f	t	\N	\N	2026-05-12 01:11:02.615	\N	2026-05-12 01:11:02.615	2026-05-12 01:11:02.615
98bd0e1f-ebde-4e84-a3e2-3d7ac3e1fdc0	bf201f72-9858-4a6f-960e-c55260becb1d	Monitoramento 24h ativado	Comunicamos que o sistema de CFTV foi atualizado e o monitoramento 24 horas est├í ativo em todas as ├íreas externas do condom├¡nio.	c7967c6e-846e-47fd-a747-b1e23bbed4b1	f	f	\N	\N	2026-05-12 01:11:02.617	\N	2026-05-12 01:11:02.617	2026-05-12 01:11:02.617
c216dc97-60e3-4d6b-a211-b0891ba71ca6	bf201f72-9858-4a6f-960e-c55260becb1d	Torneio de futsal ÔÇö quem topa?	Moradores interessados em participar de um torneio amistoso de futsal, entrem em contato pelo chat. Precisamos de no m├¡nimo 3 times!	c7967c6e-846e-47fd-a747-b1e23bbed4b1	f	f	\N	\N	2026-05-12 01:11:02.62	\N	2026-05-12 01:11:02.62	2026-05-12 01:11:02.62
cb3037e3-9429-4240-ab93-eaf238d55021	bf201f72-9858-4a6f-960e-c55260becb1d	Teste de integra├º├úo mobile	Este aviso foi criado pelo app mobile para validar a integra├º├úo com o painel admin.	0ec1d139-b828-49cc-954d-d7d2510fe8e8	f	f	\N	\N	2026-05-14 19:33:59.953	\N	2026-05-14 19:33:59.953	2026-05-14 19:33:59.953
\.


--
-- Data for Name: area_blocked_periods; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.area_blocked_periods (id, "commonAreaId", reason, "startDate", "endDate", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: assemblies; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.assemblies (id, "condominiumId", title, description, "meetingUrl", "scheduledAt", "startedAt", "finishedAt", "minutesUrl", status, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: assembly_attendees; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.assembly_attendees (id, "assemblyId", "userId", "joinedAt", "leftAt") FROM stdin;
\.


--
-- Data for Name: assembly_votes; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.assembly_votes (id, "votingItemId", "userId", "optionId", "votedAt") FROM stdin;
\.


--
-- Data for Name: assembly_voting_items; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.assembly_voting_items (id, "assemblyId", title, description, options) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.audit_logs (id, "userId", "condominiumId", action, module, "entityType", "entityId", description, metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: charges; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.charges (id, "unitId", "accountId", "categoryId", description, amount, "dueDate", "paidAt", "paidAmount", status, "referenceMonth", "gatewayId", "gatewayStatus", "pixQrCode", "pixCopyPaste", "paymentLink", "boletoUrl", "boletoCode", "penaltyAmount", "interestRate", "createdBy", "createdAt", "updatedAt") FROM stdin;
3c3ee848-3d8d-425e-87dd-afd8ad404324	45b3f803-9747-4527-b8e5-a7b9776944d8	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-01	850.00	2026-01-10 03:00:00	\N	\N	OVERDUE	2026-01	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.518	2026-05-12 01:11:02.518
91d4262c-6513-4d64-9520-7615188284e9	45b3f803-9747-4527-b8e5-a7b9776944d8	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-02	850.00	2026-02-10 03:00:00	2026-02-13 22:48:51.183	850.00	PAID	2026-02	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.522	2026-05-12 01:11:02.522
70a139f2-9576-4e6b-8e2a-ccfbc72b9848	45b3f803-9747-4527-b8e5-a7b9776944d8	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-03	850.00	2026-03-10 03:00:00	2026-03-12 03:43:00.134	850.00	PAID	2026-03	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.525	2026-05-12 01:11:02.525
78087b4b-38ff-48ef-90ef-4d35c6dc800b	78bdbbac-6ceb-4611-9073-7221f97b3d8e	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-01	850.00	2026-01-10 03:00:00	2026-01-12 10:05:48.236	850.00	PAID	2026-01	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.528	2026-05-12 01:11:02.528
61c84ed6-2ee9-4926-a704-0635d946ab81	78bdbbac-6ceb-4611-9073-7221f97b3d8e	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-02	850.00	2026-02-10 03:00:00	2026-02-13 15:37:52.065	850.00	PAID	2026-02	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.531	2026-05-12 01:11:02.531
31013a20-d0b6-4394-8351-dd049619ca19	78bdbbac-6ceb-4611-9073-7221f97b3d8e	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-03	850.00	2026-03-10 03:00:00	2026-03-13 17:54:39.213	850.00	PAID	2026-03	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.533	2026-05-12 01:11:02.533
d832d437-65e0-4aef-a5fa-a47d71b4f155	a494513d-4f53-4c1a-a8b3-2baf4afe4097	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-01	850.00	2026-01-10 03:00:00	2026-01-11 10:13:05.943	850.00	PAID	2026-01	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.536	2026-05-12 01:11:02.536
117f2d1a-0bf5-4941-8023-c1b7d07c0032	a494513d-4f53-4c1a-a8b3-2baf4afe4097	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-02	850.00	2026-02-10 03:00:00	2026-02-12 15:43:09.876	850.00	PAID	2026-02	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.538	2026-05-12 01:11:02.538
4e0637cb-2b20-47cd-aaab-b138f70b2814	a494513d-4f53-4c1a-a8b3-2baf4afe4097	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-03	850.00	2026-03-10 03:00:00	\N	\N	OVERDUE	2026-03	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.54	2026-05-12 01:11:02.54
9e28be3b-554d-4c19-8b48-f8b575aa9181	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-01	850.00	2026-01-10 03:00:00	\N	\N	OVERDUE	2026-01	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.544	2026-05-12 01:11:02.544
470d95f9-22d9-45ca-845e-387489f38c42	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-02	850.00	2026-02-10 03:00:00	2026-02-14 14:18:13.69	850.00	PAID	2026-02	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.546	2026-05-12 01:11:02.546
0c16627e-233e-4837-a40d-89bc35845238	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-03	850.00	2026-03-10 03:00:00	2026-03-10 03:57:40.995	850.00	PAID	2026-03	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.549	2026-05-12 01:11:02.549
a1c8614e-6602-4afb-b8bb-a0a2e05d0d4b	2951fed8-9753-4307-a0e5-51625785922e	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-01	850.00	2026-01-10 03:00:00	2026-01-14 21:27:36.901	850.00	PAID	2026-01	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.551	2026-05-12 01:11:02.551
39d8cafe-5cc9-4ff1-b799-080e63d03687	2951fed8-9753-4307-a0e5-51625785922e	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-02	850.00	2026-02-10 03:00:00	2026-02-13 19:05:49.31	850.00	PAID	2026-02	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.553	2026-05-12 01:11:02.553
753aa5cf-7920-48ba-a554-964b274a70ca	2951fed8-9753-4307-a0e5-51625785922e	seed-account-001	2d6f9a96-fbe1-4969-a173-c555d12fe63a	Cond. Mensal 2026-03	850.00	2026-03-10 03:00:00	\N	\N	OVERDUE	2026-03	\N	\N	\N	\N	\N	\N	\N	0.00	0.0000	c7967c6e-846e-47fd-a747-b1e23bbed4b1	2026-05-12 01:11:02.555	2026-05-12 01:11:02.555
\.


--
-- Data for Name: chat_conversations; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.chat_conversations (id, "condominiumId", "unitId", subject, participants, "isOpen", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.chat_messages (id, "conversationId", "senderId", content, attachments, "isRead", "createdAt") FROM stdin;
\.


--
-- Data for Name: collection_rules; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.collection_rules (id, "condominiumId", name, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: collection_steps; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.collection_steps (id, "ruleId", "daysAfterDue", channels, "messageTemplate", action) FROM stdin;
\.


--
-- Data for Name: common_areas; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.common_areas (id, "condominiumId", name, description, capacity, rules, "photoUrls", "isActive", "requiresApproval", "maxDaysAdvance", "openTime", "closeTime", "createdAt", "updatedAt") FROM stdin;
seed-area-001	bf201f72-9858-4a6f-960e-c55260becb1d	Sal├úo de Festas	Sal├úo com capacidade para 100 pessoas, cozinha equipada	100	Hor├írio: 10h ├ás 22h. Limpeza obrigat├│ria ap├│s uso.	\N	t	t	30	10:00	22:00	2026-05-12 01:10:34.629	2026-05-12 01:10:34.629
seed-area-002	bf201f72-9858-4a6f-960e-c55260becb1d	Quadra Poliesportiva	\N	20	Hor├írio: 7h ├ás 22h. Cal├ºado esportivo obrigat├│rio.	\N	t	f	30	07:00	22:00	2026-05-12 01:10:34.636	2026-05-12 01:10:34.636
\.


--
-- Data for Name: condominium_contracts; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.condominium_contracts (id, "condominiumId", title, vendor, "contractType", "startDate", "endDate", value, "adjustmentIndex", "fileUrl", notes, "autoRenew", "alertDaysBefore", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: condominium_documents; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.condominium_documents (id, "condominiumId", title, description, category, "fileName", "storedName", "filePath", "fileSize", "mimeType", "uploadedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: condominium_users; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.condominium_users (id, "userId", "condominiumId", role, "isActive", "joinedAt", "unitId") FROM stdin;
3c7375d6-304b-4104-93f5-7f8443105d6d	5abf8d58-d20d-46f8-875d-a89226deb612	bf201f72-9858-4a6f-960e-c55260becb1d	SUPER_ADMIN	t	2026-05-12 00:58:28.291	\N
938c91ce-35e2-4cd8-b6a1-228593945541	5338be1a-1d63-4f39-904b-1d9aec6cf327	bf201f72-9858-4a6f-960e-c55260becb1d	SYNDIC	t	2026-05-12 14:50:02.312	\N
2e1b06d4-17bc-4cde-ad55-8f5f178c3a99	12f31d72-8876-4bed-9a44-dc4d91c2f82f	bf201f72-9858-4a6f-960e-c55260becb1d	DOORMAN	t	2026-05-12 14:50:02.676	\N
e2f34714-a383-4f39-a5f9-09de7e90b942	0ec1d139-b828-49cc-954d-d7d2510fe8e8	bf201f72-9858-4a6f-960e-c55260becb1d	CONDOMINIUM_ADMIN	t	2026-05-12 01:10:51.781	\N
96dc2da0-50da-4261-814b-46873ec7e4fa	03825361-7ef3-4203-8720-ddd492b452ff	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.279	ebecc098-de21-454f-8272-2c68d65f9128
0ae1939a-b97f-4b8a-8277-afb58216f4a3	6737d086-44b2-4f05-9079-70f7dd05df61	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.293	7ed34f7c-9ba4-4359-97a9-e38cddfd78b7
5a5f7086-e71a-4bd2-b9d2-3cfc29e08981	f1d95393-36a5-479d-a629-8ae156188e3d	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.3	4152fb67-1bfd-4b8e-9687-d0dd9b63091b
704c9f4f-d511-435d-9bf2-3183e8ec5e0a	35a7cf5d-7c74-4405-b936-51281175a94b	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.308	2951fed8-9753-4307-a0e5-51625785922e
4700c552-7af8-4acf-85bb-42e4469431d8	e4fe03cf-bfec-4a73-b7ed-cccc36531628	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.316	e94f35b2-595b-4ac0-b002-b935f6d9c737
357e7c31-4447-4ef9-8c25-d8d065c86864	1086bd2d-f916-46d8-918a-fda586e41e38	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.325	90ed3f50-d8a5-4dd5-a047-ec60467e5c7e
221fba01-bafb-4e45-8ef5-01b495a8e47b	5a94be4a-7d82-4b29-8904-90b106aa20cb	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.332	abb8071c-8c30-48a9-8ded-4cc99fbcf824
a14040ff-26d3-49b5-aa05-29f068ed0a38	102c209f-3d78-4d53-a75f-d1d29e260649	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.341	5630c66a-5ac6-4870-aacd-978423dd09a3
bcb04d7f-1534-427c-8bd5-499ced4dc204	df8358bd-e3ee-4b48-9262-761d8adfa31b	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.348	8d31d662-27c3-4da9-959e-1f948a3cdbbf
e3cf907f-06d8-4f3b-87b3-fb93365d2ba2	1b8b8893-e9c0-4bb3-9f6e-818962dc9f25	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.355	e00896dd-ad7c-4930-851f-6001ee329f5b
244ffd9b-f498-4d53-b077-e75241c8ce1c	6a353ce1-b949-459f-bacf-fcc158664b95	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.363	0da75953-6099-4b0e-b392-a1ebe6de2b04
a0bdda1d-d103-43f1-9ef2-38a159ad6625	1ef8bdb5-6c5f-49c7-9dcb-28fdc460dcd9	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.371	f761af34-ea22-4ea6-b1b5-1e5d72670fd0
d8d780cf-7cb0-4db2-b0f4-c8100228ddcf	d48ad5f2-1406-454e-aa93-ad938a2d8e91	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.378	a2988e7a-b077-443f-a4af-5c8a4b180d44
b11ce60f-10ed-40e7-8363-34b312ba7fcd	d16f2d57-61e5-42df-b864-f6a1599a6a98	bf201f72-9858-4a6f-960e-c55260becb1d	SYNDIC	t	2026-05-12 01:23:56.384	615a6f92-1d40-48d6-badf-a3c51fc73ff9
07f95cab-3b6f-4a17-9fbd-965c63cc3998	50bb509d-996b-4c5f-80d6-6e7aa4684175	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.398	11d42ae5-2a36-4f5d-b871-015a97324461
1b821bbe-7c48-4ffe-80d1-0c170ea29d98	65250756-5061-4d7e-abe0-4040920ac24d	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.413	3f0fefc6-d750-49a0-bd7e-c1514e38d0f1
ee68942e-07b2-4610-adcf-6301753fe5ef	edfdd051-1bab-45a3-a8bb-4c498d4d8a1e	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.419	6c0fa490-7e81-4c78-83ce-636e2f9dfa70
b26aac1e-3ef0-448b-a492-d3b2152f1c2d	8c6659de-827c-4623-bf89-6f8d3f081ca5	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.427	c08a4203-725d-4b7b-84b2-e2deef8eb614
f5bcabfa-5f34-4042-889b-59e50d0c81f6	583d912a-0df1-4992-a708-e9216e7f7126	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.433	82ebd51d-0e0d-4ced-91ce-bb7f5e508e3f
06da4c02-ad08-4a13-9a77-ace1f69f17aa	53644396-ae8c-4228-9b16-8ef3bd4ad21f	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.442	60e59e98-f334-4a44-b7d8-36b38f895e13
e754afeb-40fd-46f9-bdc1-856fc89513b6	a5b2b1fa-17bd-4021-862b-0843b74cb75a	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.45	31847c5f-a17e-43de-a5ab-4a7f4de7cd26
f1e8e93a-c985-41b7-b553-523ce4fc47e1	3cf0b20f-350b-4994-a4f0-bf6fe5a6e060	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.46	d773a8d8-cac3-4c7a-9113-ff801a9248e9
98ebe25c-97e1-4e41-8694-e1438542c66f	d747e5ca-c834-43fc-af8b-b0f4e1b35962	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.47	62e4981b-1701-4046-9b87-b1fb829639df
a811c41f-ba3e-4947-803f-93a632ddd930	513f40e6-2c29-48a1-9d96-22dd1d53875c	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.479	a2b7fdef-671e-4f14-8635-363eed15892a
518ead68-2350-4aa3-bdec-ba7d03891fa7	51c42160-f54c-4b10-a74d-da40df4adce2	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.488	36938469-d050-435d-9712-4528f99c9233
b64451eb-d674-4e43-ac09-dc853d9227e6	8a9ead9d-8531-4ddb-ab3f-779c1af8471c	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.496	b9e43b37-9d0c-4506-9e53-81c0fb19b2a9
a025a3e1-6214-4902-a238-a2b83bda4579	f0805cb7-7f43-49af-843a-40165f5774d5	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.505	536a52e6-5350-4d52-b39f-d4e220afb224
67035cba-e279-4a1c-8f76-827431579abf	f47efcb9-7ae6-4611-a380-f2be695945cc	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.514	59464d44-fcfb-49c1-b89f-f4d0da25a1ec
1b9a097d-aa08-447b-8679-d2d68a13cfce	1b2d9b16-bd0a-4425-8fb7-60fb997b2df3	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.524	13ad9b30-7728-4f16-8b14-102c15481ad6
7aecb50d-f2a5-4b10-8b96-4f7c880b5a07	bdb50e1f-c1d7-4e4c-ad81-8bb67d7bb0a0	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.531	f413f8a1-5f8a-49d8-9ab3-4f84ac3ec103
e00bc14a-a717-49ea-8e3e-ad16eedaa36a	a514534d-1257-4ef9-ae1a-713456ac2eaa	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.538	7c8e8ae9-bc34-439b-9c37-afc089bd2045
6ee2d721-f7fd-490c-b0c6-c4b24cb5de07	9640f393-9658-43bb-89e0-10da4e8f1b9e	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.546	1255a388-b5d4-4b79-8218-d8ba2f423990
44d39eda-a38f-44cf-aaa5-33a03b856511	ba29cdd9-d618-4fd6-888b-3877bb05f997	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.552	62b6027e-c5b6-47f7-8788-f908cc90eb00
1e171d3b-b638-4518-9d56-d6003d7e162f	17c4cf3a-6023-4810-be4d-b41c7c073dce	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.56	b7f217ef-cb87-42b9-8104-4067ed23be6b
6a6217b9-c039-4095-91f0-b4687f3425ba	87e00b24-a9e8-44a9-a7cd-5717631a7ed4	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.567	adb3a0bf-9377-4214-a645-da6559b6c4f8
414d02d2-0dff-4aa6-8636-28d2d157eae0	309400f2-1259-49fe-a157-7a03a5b32172	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.575	b6f24179-8ad5-4a10-82aa-1588e4f735ff
3bfcb5a3-2d85-486d-910a-1d2b854d8f5d	a3dcf4c5-ddb5-45a9-8ade-05c0c8882774	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.583	f6ac4ca9-ad0b-4de9-96b1-9cb48a6738e6
981f5efa-7884-4e08-8455-b2ed6d7265a8	c497e64c-3743-414d-9fb9-03859d4bca9e	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.591	38b4b717-493d-42e9-b4cb-4703d526225a
5f03a8de-6389-45c4-81a4-023edae349b3	75f89b75-723b-4aaf-ae77-afa375401cd8	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.598	21ccc564-2775-432e-9770-2da727e4d6be
2b8b8d48-7a40-4f57-bc5d-6fada7e959b4	5dd79b37-94ea-4b32-b746-1605b7cf29ae	bf201f72-9858-4a6f-960e-c55260becb1d	RESIDENT	t	2026-05-12 01:23:56.392	615a6f92-1d40-48d6-badf-a3c51fc73ff9
\.


--
-- Data for Name: condominiums; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.condominiums (id, name, cnpj, address, city, state, "zipCode", phone, email, "logoUrl", timezone, "isActive", plan, "maxUnits", "createdAt", "updatedAt") FROM stdin;
bf201f72-9858-4a6f-960e-c55260becb1d	Residencial Veredas do Bosque	12345678000195	Rua das Palmeiras, 500	Goi├ónia	GO	74000000	(62) 3000-0000	admin@veredasdobosque.com.br	\N	America/Sao_Paulo	t	professional	80	2026-05-12 00:58:28.283	2026-05-12 00:58:28.283
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.contracts (id, "condominiumId", "serviceProviderId", title, description, value, "startDate", "endDate", "isActive", "documentUrl", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: dependents; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.dependents (id, "unitId", name, relationship, "birthDate", cpf, "photoUrl", "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: digital_signage_screens; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.digital_signage_screens (id, "condominiumId", name, location, token, "isActive", "slideDuration", "primaryColor", "logoUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: digital_signage_slides; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.digital_signage_slides (id, "screenId", type, title, content, "imageUrl", "backgroundColor", "textColor", "order", duration, "isActive", "validFrom", "validUntil", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.employees (id, "condominiumId", name, cpf, role, phone, email, shift, "admissionDate", "salaryAmount", "isActive", notes, "createdAt", "updatedAt", "userId") FROM stdin;
seed-employee-001	bf201f72-9858-4a6f-960e-c55260becb1d	Jo├úo da Silva	55566677788	Porteiro	(11) 99999-1111	\N	MORNING	2023-01-01 00:00:00	\N	t	\N	2026-05-12 01:10:34.612	2026-05-12 01:10:34.612	\N
\.


--
-- Data for Name: finalized_assemblies; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.finalized_assemblies (id, title, description, date, "minutesUrl", "condominiumId") FROM stdin;
\.


--
-- Data for Name: financial_accounts; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.financial_accounts (id, "condominiumId", name, "bankName", agency, "accountNumber", balance, "isActive", "gatewayType", "gatewayKey", "gatewayConfig", "createdAt", "updatedAt") FROM stdin;
seed-account-001	bf201f72-9858-4a6f-960e-c55260becb1d	Conta Principal	Banco do Brasil	1234	56789-0	15000.00	t	NONE	\N	\N	2026-05-12 01:10:34.62	2026-05-12 01:10:34.62
a0000000-0000-4000-8000-000000000001	bf201f72-9858-4a6f-960e-c55260becb1d	Conta Principal	Banco do Brasil	1234	56789-0	15000.00	t	NONE	\N	\N	2026-05-12 20:10:05.443	2026-05-12 20:10:05.443
\.


--
-- Data for Name: financial_categories; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.financial_categories (id, "condominiumId", name, type, description, "isActive", "createdAt") FROM stdin;
2d6f9a96-fbe1-4969-a173-c555d12fe63a	bf201f72-9858-4a6f-960e-c55260becb1d	Condom├¡nio Mensal	INCOME	\N	t	2026-05-12 01:11:02.513
08a1db2e-db61-49e4-9657-fb2a7d502d05	bf201f72-9858-4a6f-960e-c55260becb1d	Fundo de Reserva	INCOME	\N	t	2026-05-12 01:11:02.516
\.


--
-- Data for Name: financial_transactions; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.financial_transactions (id, "accountId", "categoryId", type, amount, description, "dueDate", "paidAt", "referenceMonth", "receiptUrl", notes, "createdBy", "chargeId", "createdAt", "updatedAt") FROM stdin;
afd537b2-7659-42f9-9c68-79d70e37a1df	seed-account-001	\N	INCOME	4250.00	Condom├¡nio Janeiro 2026 - 5 unidades	2026-03-12 15:00:00	2026-03-14 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.558	2026-05-12 01:11:02.558
35c6af68-50af-4b92-8de4-9dfe73e6c34f	seed-account-001	\N	INCOME	4250.00	Condom├¡nio Fevereiro 2026 - 5 unidades	2026-04-11 15:00:00	2026-04-13 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.563	2026-05-12 01:11:02.563
81c69444-1de8-4e5d-9acf-81d94298f48c	seed-account-001	\N	EXPENSE	1200.00	Conta de ├ígua ÔÇö fevereiro	2026-04-16 15:00:00	2026-04-17 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.566	2026-05-12 01:11:02.566
3f7df4c2-1b25-4557-b16a-6c5167d81031	seed-account-001	\N	EXPENSE	980.00	Conta de energia ÔÇö fevereiro	2026-04-21 15:00:00	2026-04-22 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.569	2026-05-12 01:11:02.569
47286f96-55d8-4709-b4b9-17e2082f7ced	seed-account-001	\N	EXPENSE	2500.00	Folha de pagamento ÔÇö fevereiro	2026-04-26 15:00:00	2026-04-26 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.571	2026-05-12 01:11:02.571
d224feb3-4a15-464b-8b05-0db7d25f1784	seed-account-001	\N	EXPENSE	350.00	Material de limpeza	2026-05-01 15:00:00	2026-05-02 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.573	2026-05-12 01:11:02.573
c316ece1-8fa1-4e2a-974e-9a3ea88a96ee	seed-account-001	\N	EXPENSE	480.00	Manuten├º├úo bomba d'├ígua	2026-05-06 15:00:00	2026-05-06 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.576	2026-05-12 01:11:02.576
83ddb7e0-f763-4b5c-b685-59efa66e379f	seed-account-001	\N	INCOME	300.00	Aluguel do sal├úo de festas ÔÇö fevereiro	2026-04-13 15:00:00	2026-04-14 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.579	2026-05-12 01:11:02.579
75b3de23-22b9-4bfc-bb70-2f4af62685e4	seed-account-001	\N	EXPENSE	1800.00	Seguro do condom├¡nio ÔÇö parcela 3/12	2026-05-09 15:00:00	2026-05-09 15:00:00	2026-02	\N	\N	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	2026-05-12 01:11:02.581	2026-05-12 01:11:02.581
\.


--
-- Data for Name: fines; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.fines (id, "condominiumId", "unitId", "reportedBy", description, regulation, "photoUrls", amount, "appealDeadline", "appealText", "appealedAt", "appealStatus", "appealResponse", status, "chargeId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: lost_and_found; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.lost_and_found (id, title, description, category, place, status, "photoUrl", "foundDate", "lostDate", "returnedAt", "returnedTo", "condominiumId", "createdById", "createdAt", "updatedAt") FROM stdin;
a9047272-0883-4f86-8717-421c15ed8d11	Chave encontrada	Molho de 3 chaves	Chaves	Hall bloco A	FOUND	\N	\N	\N	\N	\N	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-14 19:52:19.855	2026-05-14 19:52:19.855
\.


--
-- Data for Name: maintenance_schedules; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.maintenance_schedules (id, "condominiumId", title, description, category, location, frequency, "nextDueDate", "lastDoneDate", "estimatedCost", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: marketplace_offers; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.marketplace_offers (id, "partnerId", title, description, discount, "couponCode", "validUntil", status, "createdAt", "updatedAt") FROM stdin;
9b8a63a2-6e70-4d30-905f-cec4aa09c920	demo-partner-saude-farm├í	10% de desconto para moradores	Desconto especial para moradores do condom├¡nio Residencial Veredas do Bosque	10%	CONDO10	\N	ACTIVE	2026-05-12 01:11:02.636	2026-05-12 01:11:02.636
4dbe73cd-2d13-4612-a348-3b97f328bbfb	demo-partner-alimentacao-resta	10% de desconto para moradores	Desconto especial para moradores do condom├¡nio Residencial Veredas do Bosque	10%	CONDO10	\N	ACTIVE	2026-05-12 01:11:02.647	2026-05-12 01:11:02.647
399c4361-7013-460b-b332-cf4ce03583ef	demo-partner-saude-acade	10% de desconto para moradores	Desconto especial para moradores do condom├¡nio Residencial Veredas do Bosque	10%	CONDO10	\N	ACTIVE	2026-05-12 01:11:02.654	2026-05-12 01:11:02.654
\.


--
-- Data for Name: marketplace_partners; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.marketplace_partners (id, name, description, "logoUrl", website, phone, email, category, "isActive", "createdAt", "updatedAt") FROM stdin;
demo-partner-saude-farm├í	Farm├ícia Sa├║de Viva	Farm├ícia com atendimento especializado e delivery	\N	https://saudeviva.com.br	(11) 98765-0001	\N	saude	t	2026-05-12 01:11:02.63	2026-05-12 01:11:02.63
demo-partner-alimentacao-resta	Restaurante Sabor & Arte	Culin├íria caseira com op├º├Áes vegetarianas	\N	\N	(11) 98765-0002	\N	alimentacao	t	2026-05-12 01:11:02.641	2026-05-12 01:11:02.641
demo-partner-saude-acade	Academia FitLife	Academia completa com personal trainer	\N	https://fitlife.com.br	(11) 98765-0003	\N	saude	t	2026-05-12 01:11:02.65	2026-05-12 01:11:02.65
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.notifications (id, "userId", type, title, message, data, "isRead", "readAt", "createdAt") FROM stdin;
c795434f-0985-4aa6-a88d-c2e554d96348	d16f2d57-61e5-42df-b864-f6a1599a6a98	VISITOR	Visitante chegou	Maria da Silva entrou no condom├¡nio	{"visitorId": "2b202eca-3d1c-4e87-9717-d49fd7fcf0ce"}	f	\N	2026-05-13 16:23:20.577
a7413314-fcdf-402a-a373-d335676e63ee	5dd79b37-94ea-4b32-b746-1605b7cf29ae	VISITOR	Visitante chegou	Maria da Silva entrou no condom├¡nio	{"visitorId": "2b202eca-3d1c-4e87-9717-d49fd7fcf0ce"}	f	\N	2026-05-13 16:23:20.736
4ea3038f-6147-4ab6-9f01-42b0ad4305be	d16f2d57-61e5-42df-b864-f6a1599a6a98	VISITOR	Visitante chegou	joao avelange entrou no condom├¡nio	{"visitorId": "13d7e698-0995-4cf0-8797-743841ff722d"}	f	\N	2026-05-14 18:48:41.787
afa41155-2105-49ab-9dbe-cc329e4ea251	5dd79b37-94ea-4b32-b746-1605b7cf29ae	VISITOR	Visitante chegou	joao avelange entrou no condom├¡nio	{"visitorId": "13d7e698-0995-4cf0-8797-743841ff722d"}	f	\N	2026-05-14 18:48:41.882
f15f928a-6421-407a-9362-48a23f2377cd	d16f2d57-61e5-42df-b864-f6a1599a6a98	VISITOR	Visitante chegou	joao losa entrou no condom├¡nio	{"visitorId": "400eef8c-aac3-41c7-a125-f2bd849ca619"}	f	\N	2026-05-14 18:56:54.788
553e92b2-0322-499a-b7c8-0da22ea9c89f	5dd79b37-94ea-4b32-b746-1605b7cf29ae	VISITOR	Visitante chegou	joao losa entrou no condom├¡nio	{"visitorId": "400eef8c-aac3-41c7-a125-f2bd849ca619"}	f	\N	2026-05-14 18:56:54.851
ac8ae4c2-5e2e-4459-a94b-f38886c5615e	d16f2d57-61e5-42df-b864-f6a1599a6a98	PARCEL	Encomenda recebida	Nova encomenda da Correios aguarda retirada	{"parcelId": "fea9b14c-51a5-46a3-a96d-2049a6b6a5a2", "trackingCode": "25111f2sdFFosoofos"}	f	\N	2026-05-14 19:01:29.489
204e61c0-3b97-46aa-95a1-6daf74a99bd3	5dd79b37-94ea-4b32-b746-1605b7cf29ae	PARCEL	Encomenda recebida	Nova encomenda da Correios aguarda retirada	{"parcelId": "fea9b14c-51a5-46a3-a96d-2049a6b6a5a2", "trackingCode": "25111f2sdFFosoofos"}	f	\N	2026-05-14 19:01:29.552
ffb5e819-5825-4e74-ae9a-734413290b19	d16f2d57-61e5-42df-b864-f6a1599a6a98	PARCEL	Encomenda recebida	Nova encomenda da Correios aguarda retirada	{"parcelId": "1eea3eba-bd84-4edd-a358-5b8efe06a7cd", "trackingCode": "6665FgGGD44444"}	f	\N	2026-05-14 19:01:59.299
4062ef08-2122-4afd-939c-78424df4e313	5dd79b37-94ea-4b32-b746-1605b7cf29ae	PARCEL	Encomenda recebida	Nova encomenda da Correios aguarda retirada	{"parcelId": "1eea3eba-bd84-4edd-a358-5b8efe06a7cd", "trackingCode": "6665FgGGD44444"}	f	\N	2026-05-14 19:01:59.359
a5566849-445c-4f08-8653-6da9124ecede	d16f2d57-61e5-42df-b864-f6a1599a6a98	PARCEL	Encomenda recebida	Nova encomenda da Correios aguarda retirada	{"parcelId": "e2e0b399-f702-462f-90ba-074b471aa8a4", "trackingCode": "6565656", "storageLocation": "caixa5"}	f	\N	2026-05-14 19:19:16.581
2be9dbc4-6099-48d8-baf8-415d7a9f04b0	5dd79b37-94ea-4b32-b746-1605b7cf29ae	PARCEL	Encomenda recebida	Nova encomenda da Correios aguarda retirada	{"parcelId": "e2e0b399-f702-462f-90ba-074b471aa8a4", "trackingCode": "6565656", "storageLocation": "caixa5"}	f	\N	2026-05-14 19:19:16.648
\.


--
-- Data for Name: occurrences; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.occurrences (id, "condominiumId", "reportedBy", title, description, category, location, "photoUrls", status, priority, "resolvedAt", "resolvedBy", resolution, "createdAt", "updatedAt") FROM stdin;
77301fdf-b7ac-4a66-8a11-b8f833173f08	bf201f72-9858-4a6f-960e-c55260becb1d	4bf33a9c-4bf1-49e6-ba24-1518eeb4b306	Barulho excessivo na madrugada	Som alto ap├│s 23h no bloco A, unidade 03	barulho	\N	\N	RESOLVED	HIGH	2026-05-04 15:00:00	c7967c6e-846e-47fd-a747-b1e23bbed4b1	Morador notificado e situa├º├úo regularizada	2026-05-03 15:00:00	2026-05-12 01:11:02.496
e41b796d-3a1c-4bf7-a067-e9ceec9f2ee3	bf201f72-9858-4a6f-960e-c55260becb1d	94d13791-78ed-49bb-8f9d-62c92e04a5e1	Lixo descartado incorretamente	Sacolas de lixo deixadas fora dos cont├¬ineres	limpeza	\N	\N	RESOLVED	MEDIUM	2026-05-07 15:00:00	c7967c6e-846e-47fd-a747-b1e23bbed4b1	Advert├¬ncia enviada e lixo recolhido	2026-05-06 15:00:00	2026-05-12 01:11:02.5
89417a2a-142e-49e2-9d1d-3115c31751aa	bf201f72-9858-4a6f-960e-c55260becb1d	d7aac45d-8c79-4a99-b32c-6cb7ad022c22	Ve├¡culo ocupando vaga de outro	Carro branco sem identifica├º├úo na vaga 15	seguran├ºa	\N	\N	IN_ANALYSIS	MEDIUM	\N	\N	\N	2026-05-09 15:00:00	2026-05-12 01:11:02.502
39d7a53a-1691-457c-aa0b-83b6e8b2a5bf	bf201f72-9858-4a6f-960e-c55260becb1d	b2297fd8-a82b-4c8c-b321-b5c8a0f8d178	Camera de seguran├ºa com defeito	C├ómera 03 da entrada principal sem imagem	seguran├ºa	\N	\N	OPEN	HIGH	\N	\N	\N	2026-05-10 15:00:00	2026-05-12 01:11:02.505
847a1e45-3f7e-417e-b919-30d6fe0b5e3f	bf201f72-9858-4a6f-960e-c55260becb1d	9770990d-553c-42c8-a2b6-c7939a4217ee	Picha├º├úo no muro lateral	Grafite no muro norte descoberto durante a ronda	vandalismo	\N	\N	OPEN	MEDIUM	\N	\N	\N	2026-05-11 19:11:02.495	2026-05-12 01:11:02.508
\.


--
-- Data for Name: panic_alerts; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.panic_alerts (id, "condominiumId", "triggeredBy", "resolvedBy", "resolvedAt", notes, "createdAt") FROM stdin;
6dab067e-1bce-41d1-ad31-839be330ff50	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-14 19:57:56.262	\N	2026-05-14 19:56:35.302
572cca75-f2e6-4667-b982-41c8fbbbe238	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-14 19:57:58.28	\N	2026-05-14 19:35:22.334
8f1d4570-944f-4b89-bde9-a04edbf56607	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-14 19:58:03.852	\N	2026-05-14 19:34:50.585
5d8b773c-fe10-44d4-ada1-890bd5e4f3f0	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-14 19:58:08.109	\N	2026-05-14 19:30:24.694
e0c52b80-fba7-48ba-83d0-73a7850be1d0	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-14 19:58:20.849	\N	2026-05-14 19:30:49.542
63cad372-1460-42ce-ab8d-88eb3b46550b	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-15 13:41:27.602	\N	2026-05-14 20:00:24.572
3785c828-4ede-4b59-95f9-a46e8a716842	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-15 13:41:37.621	\N	2026-05-14 20:05:07.411
131e193d-db10-4c23-a8f0-0e7bad7be63d	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-15 13:42:03.953	\N	2026-05-15 13:33:15.801
e20c87e2-f076-4df0-82eb-d5904f3955cd	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-15 13:42:08.324	\N	2026-05-15 13:41:05.594
decb5b40-9b1f-4c9b-8328-4f85390f7e69	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-15 13:42:12.17	\N	2026-05-15 13:40:05.249
36422cac-d87d-44ea-81df-bad358343686	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-15 13:42:16.121	\N	2026-05-14 20:09:37.725
8ad436e9-d060-4635-a0fd-dcde93f2e2dc	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-15 13:42:21.168	\N	2026-05-14 20:01:09.76
33cd63e2-e1ca-45ca-9921-fca2449d7e00	bf201f72-9858-4a6f-960e-c55260becb1d	0ec1d139-b828-49cc-954d-d7d2510fe8e8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-15 13:43:48.869	\N	2026-05-15 13:43:16.672
\.


--
-- Data for Name: parcels; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.parcels (id, "unitId", "senderName", carrier, "trackingCode", "photoUrl", "storageLocation", status, "receivedAt", "notifiedAt", "pickedUpAt", "pickedUpBy", "pickupSignature", notes, "registeredBy", "deliveryPersonDoc", "deliveryPersonName", "hasPackageDamage", "vehiclePlate") FROM stdin;
06f8c72e-6e91-48ab-a42a-ebcc495aa72e	45b3f803-9747-4527-b8e5-a7b9776944d8	Amazon Brasil	Correios	BR123456789BR	\N	Prateleira A-1	PICKED_UP	2026-05-06 15:00:00	2026-05-06 15:00:00	2026-05-07 15:00:00	Ana Costa	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	\N	f	\N
ab2438d7-b169-4a53-a27c-333ac3b6b328	78bdbbac-6ceb-4611-9073-7221f97b3d8e	Mercado Livre	Total Express	ML987654321	\N	Prateleira B-2	PICKED_UP	2026-05-08 15:00:00	2026-05-08 15:00:00	2026-05-09 15:00:00	Bruno Oliveira	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	\N	f	\N
18befcc6-ccdf-4b18-99d7-6812c81045c9	a494513d-4f53-4c1a-a8b3-2baf4afe4097	Shopee	J&T Express	SH111222333	\N	Prateleira C-3	NOTIFIED	2026-05-09 15:00:00	2026-05-09 15:00:00	\N	\N	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	\N	f	\N
f53e73c8-7e54-4239-a37f-de9e365bb620	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	Riachuelo	Jadlog	RI444555666	\N	Prateleira D-4	NOTIFIED	2026-05-10 15:00:00	2026-05-10 15:00:00	\N	\N	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	\N	f	\N
fb7a12d6-a315-4a17-b03d-b33fe1c9d9f6	2951fed8-9753-4307-a0e5-51625785922e	Americanas	Correios	AM777888999	\N	Prateleira A-5	RECEIVED	2026-05-11 22:11:02.431	\N	\N	\N	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	\N	f	\N
4feec238-84cf-400b-bd0f-b6334f9430b2	b256faa7-8e04-436d-8dce-bbddb7e27a67	Kabum	Transportadora Silva	\N	\N	Prateleira B-6	RECEIVED	2026-05-12 00:11:02.431	\N	\N	\N	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	\N	f	\N
fea9b14c-51a5-46a3-a96d-2049a6b6a5a2	615a6f92-1d40-48d6-badf-a3c51fc73ff9	\N	Correios	25111f2sdFFosoofos	\N	\N	RECEIVED	2026-05-14 19:01:29.452	2026-05-14 19:01:29.465	\N	\N	\N	\N	0ec1d139-b828-49cc-954d-d7d2510fe8e8	\N	\N	f	\N
1eea3eba-bd84-4edd-a358-5b8efe06a7cd	615a6f92-1d40-48d6-badf-a3c51fc73ff9	\N	Correios	6665FgGGD44444	\N	\N	RECEIVED	2026-05-14 19:01:59.29	2026-05-14 19:01:59.294	\N	\N	\N	\N	0ec1d139-b828-49cc-954d-d7d2510fe8e8	\N	\N	f	\N
dca6dd2b-d3f0-4391-a36c-62785f443093	a494513d-4f53-4c1a-a8b3-2baf4afe4097	Loja Teste Online	Correios	BR987654321BR	\N	Portaria - Prateleira 2	RECEIVED	2026-05-14 19:18:59.906	2026-05-14 19:18:59.93	\N	\N	\N		0ec1d139-b828-49cc-954d-d7d2510fe8e8	123.456.789-00	Carlos Entregador	f	ABC-5678
e2e0b399-f702-462f-90ba-074b471aa8a4	615a6f92-1d40-48d6-badf-a3c51fc73ff9	Remetente	Correios	6565656	\N	caixa5	RECEIVED	2026-05-14 19:19:16.566	2026-05-14 19:19:16.574	\N	\N	\N	nao abrir o pacote, contem um produto	0ec1d139-b828-49cc-954d-d7d2510fe8e8	32323232323	entregador	f	ABC12335
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.password_resets (id, token, "userId", "expiresAt", used, "createdAt") FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.permissions (id, module, action, description) FROM stdin;
\.


--
-- Data for Name: pets; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.pets (id, name, type, breed, size, gender, "birthDate", color, "photoUrl", weight, "lastVaccination", "isActive", notes, "unitId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.photos (id, "condominiumId", title, description, category, "fileName", "storedName", "filePath", "fileSize", "mimeType", "uploadedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: poll_votes; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.poll_votes (id, "pollId", "userId", "optionIds", "votedAt") FROM stdin;
\.


--
-- Data for Name: polls; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.polls (id, "condominiumId", title, description, options, "allowMultiple", "isAnonymous", "startsAt", "endsAt", "createdBy", "isActive", "createdAt") FROM stdin;
ad3ea891-a8c6-4563-9c2b-bdc87f71666b	bf201f72-9858-4a6f-960e-c55260becb1d	Hor├írio de funcionamento da quadra	Queremos adequar o hor├írio da quadra ├á prefer├¬ncia dos moradores. Vote na op├º├úo que melhor atende voc├¬!	"[{\\"id\\":\\"1\\",\\"text\\":\\"6h ├ás 22h (hor├írio atual)\\",\\"votes\\":3},{\\"id\\":\\"2\\",\\"text\\":\\"6h ├ás 23h (1h a mais ├á noite)\\",\\"votes\\":7},{\\"id\\":\\"3\\",\\"text\\":\\"5h30 ├ás 22h (30min a mais pela manh├ú)\\",\\"votes\\":2}]"	f	t	2026-05-12 01:11:02.622	2026-05-18 15:00:00	c7967c6e-846e-47fd-a747-b1e23bbed4b1	t	2026-05-12 01:11:02.622
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.refresh_tokens (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
aaa1d232-5015-4b47-b111-bde603ccc159	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg1NDgyNTQsImV4cCI6MTc3OTE1MzA1NH0.dsSQRGplT0_VJPzmDHa2d38GmTj9YkmOr5jQAEjQmV4	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-19 01:10:54.181	2026-05-12 01:10:54.183
0d2eebdc-92da-4eb9-8268-b2bce8206dae	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg1NDg4ODUsImV4cCI6MTc3OTE1MzY4NX0.2WLHqCR4QBd1omBKjyHslqb9QNnhkL-U2kUiJvfMus0	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-19 01:21:25.954	2026-05-12 01:21:25.955
d07405c5-411d-40a8-b0f5-8850c6b5ebc8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg1NDg4OTEsImV4cCI6MTc3OTE1MzY5MX0.Yl3N40en0A-6qzG-SBmAoGeLNDzLX-4Uiq48XmeL2mg	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-19 01:21:31.732	2026-05-12 01:21:31.733
b254b3a8-ca51-45ee-84b7-df97cad8d6c6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJpYXQiOjE3Nzg2MTI1MTYsImV4cCI6MTc3OTIxNzMxNn0.UgkU85on0BmAJbruEcNlMpEWnWfZdc3jJaJY0EZQvbY	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-19 19:01:56.336	2026-05-12 19:01:56.337
22cada06-ddaa-4abe-bd87-78f6919def25	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg2MTQ0NTUsImV4cCI6MTc3OTIxOTI1NX0.CVQLbi_KKCXupHS9Jjrimcbtg9lVS1AFqVFlzRvwOHA	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-19 19:34:15.21	2026-05-12 19:34:15.211
b5616593-106e-4f2f-bfae-082b6a35c883	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg2MTY2MTUsImV4cCI6MTc3OTIyMTQxNX0.Q0yNSXxLOAaIN83RAXMbNIEUYtUH1nocb5u1viPy7oI	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-19 20:10:15.697	2026-05-12 20:10:15.698
ae328cd5-c0cf-416d-9d9c-b53792a886b5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg2NzY0ODEsImV4cCI6MTc3OTI4MTI4MX0.l9ImWFBAaLiLDJVWRdZ9kEsCqaux_lG81oBht7Csf3s	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-20 12:48:01.243	2026-05-13 12:48:01.244
79c40424-ce22-4bdc-bd19-f86c04223535	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg2ODA2MjAsImV4cCI6MTc3OTI4NTQyMH0.QRSEgZgUiOtbtnmCF84gWJW5rCy3Az6aLqK-m1iCZms	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-20 13:57:00.918	2026-05-13 13:57:00.919
1f51dd7d-bb82-4e12-ab5d-3e14c0ae9b6f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZGQ3OWIzNy05NGVhLTRiMzItYjc0Ni0xNjA1YjdjZjI5YWUiLCJyb2xlIjoiUkVTSURFTlQiLCJpYXQiOjE3Nzg2ODQyMDMsImV4cCI6MTc3OTI4OTAwM30.ROgre0XfZXu-3kNJ2aOT4wzwQqPMLAtY5hdiQ1Huw3E	5dd79b37-94ea-4b32-b746-1605b7cf29ae	2026-05-20 14:56:43.507	2026-05-13 14:56:43.508
ac412f30-f9a4-418b-9b4f-0b68695aa381	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZGQ3OWIzNy05NGVhLTRiMzItYjc0Ni0xNjA1YjdjZjI5YWUiLCJyb2xlIjoiUkVTSURFTlQiLCJpYXQiOjE3Nzg2ODYxMTEsImV4cCI6MTc3OTI5MDkxMX0.HCxNjneAc4hAKfzNP3ak6SaeAkDMrBqrG4_SapHEgu4	5dd79b37-94ea-4b32-b746-1605b7cf29ae	2026-05-20 15:28:31.096	2026-05-13 15:28:31.096
846ee7b4-3204-4309-b739-d6ebb3a15ff2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg2ODkxOTcsImV4cCI6MTc3OTI5Mzk5N30.bIctX3XeNdWsQmhc5texNS0lXDE-p2oGQDRnmBA0oIM	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-20 16:19:57.954	2026-05-13 16:19:57.955
9d5d2501-2f0e-4ec1-8956-58377fdd9150	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZGQ3OWIzNy05NGVhLTRiMzItYjc0Ni0xNjA1YjdjZjI5YWUiLCJyb2xlIjoiUkVTSURFTlQiLCJuYW1lIjoiU2FudGlhZ28gU29sYSBOZXRvIiwiaWF0IjoxNzc4Njg5MjUyLCJleHAiOjE3NzkyOTQwNTJ9.XlaWI_a-R4tMIwI2yxl_TguaXRGPiyds1MLyDn7xZbM	5dd79b37-94ea-4b32-b746-1605b7cf29ae	2026-05-20 16:20:52.348	2026-05-13 16:20:52.349
6e0b274a-24af-4432-a7c4-d9a713b296c4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg2OTk3MDcsImV4cCI6MTc3OTMwNDUwN30.adMVzw3i5dQ7-1e-uR9myC0qz3DtcE3crXZDRiY4Aic	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-20 19:15:07.056	2026-05-13 19:15:07.057
6501599c-6be9-4daf-8558-54ee350bbdf4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg2OTk3MTIsImV4cCI6MTc3OTMwNDUxMn0.bbnRIxPv25E-ABPa_TtaM5KCLCRfWkkht4qE5qG73PA	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-20 19:15:12.06	2026-05-13 19:15:12.061
12152425-18c2-449f-9327-0d842a488d3c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg2OTk3MTYsImV4cCI6MTc3OTMwNDUxNn0.Jo4E7_TGNOgOdeshI0RLEpuqlFP_bB0cJ-rKP-xkzfw	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-20 19:15:16.686	2026-05-13 19:15:16.687
7d3e4aae-7eec-4842-a676-ec4a285121a1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3NzI3MzksImV4cCI6MTc3OTM3NzUzOX0.1DprrNAgHfPQ-7BjY9o2zlpj8IZDAuN4WhK_OuVOyOI	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 15:32:19.597	2026-05-14 15:32:19.599
6c37ca5e-53a4-4479-9768-9ce268f11a97	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3ODEwNzMsImV4cCI6MTc3OTM4NTg3M30.68YcJA3z0v2lANmW2kl7jLd9aFRkRaRyC_s_ZKKFZeA	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 17:51:13.427	2026-05-14 17:51:13.428
f29b10c2-ea0f-46a7-afa1-2058be86a81b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3ODEwOTAsImV4cCI6MTc3OTM4NTg5MH0.ULVV-YyDQkiOxq-J4YGRFLEh4By-57NiwdzxYbL6uDg	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 17:51:30.671	2026-05-14 17:51:30.672
c66f41b8-f91b-4ff0-ae14-2dd50b5430a2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3ODI5OTQsImV4cCI6MTc3OTM4Nzc5NH0.ji7SLI0c4HvDPb3VMNWhgCH08XbeNKi1KT9KGUvGqPw	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 18:23:14.312	2026-05-14 18:23:14.313
59462312-7c6f-43b7-9361-fb1a3193953c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODI5OTUsImV4cCI6MTc3OTM4Nzc5NX0.kqoyDh2_aZpzMz_bhXuryCDEyNXX8stsZBs8slqbxNM	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 18:23:15.336	2026-05-14 18:23:15.337
24e8c9e3-097d-4f75-bea8-c1d52a15162b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJpYXQiOjE3Nzg3ODMxMDAsImV4cCI6MTc3OTM4NzkwMH0.cjLFyI0RdIn7CDVvQ08cP7Rmy9K2nWn0yxsBdIO-Sxg	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 18:25:00.331	2026-05-14 18:25:00.332
f2d881f9-d69a-456c-84c8-c01c1660059e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3ODMxMDYsImV4cCI6MTc3OTM4NzkwNn0.zW4SyBNvgZSvZf6eyzux4m8mUrEijzC63BB7k13uVW8	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 18:25:06.999	2026-05-14 18:25:07
78890844-0b4c-4379-b11b-ad464102f850	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3ODMxMTMsImV4cCI6MTc3OTM4NzkxM30.rjJXrToRtBqHTQn4q7VrjR5GiDAjYKXoUFsB1VRKYEY	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 18:25:13.734	2026-05-14 18:25:13.735
c5ade357-c1f5-4d1b-ae63-dfac6ce16968	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3ODMxMzAsImV4cCI6MTc3OTM4NzkzMH0.d6YaKfl4RHsD8LN64Y4dC7BUXLzCiY4Qt1D2HqL12F4	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 18:25:30.411	2026-05-14 18:25:30.412
45c22a63-b4d5-483a-9705-27f6d90fa838	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODM0NDAsImV4cCI6MTc3OTM4ODI0MH0.73TTfuEfLNoP5KkkWcCbRw2tUNch74xAQmb7rb_6Th0	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 18:30:40.947	2026-05-14 18:30:40.948
e9f32748-7487-457c-981b-02455db8a5a7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODM0NDYsImV4cCI6MTc3OTM4ODI0Nn0.LONMlN2nrvJboMfIyIeElu0d-mpWEwLJZY_IiA2yVj4	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 18:30:46.12	2026-05-14 18:30:46.121
39676563-a815-4a0b-a88b-0fe9f68e9183	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODM1NzMsImV4cCI6MTc3OTM4ODM3M30.3JLhv1mBfmcB2h78THSieFjGo8xrcAWQFNlJ_FSZLwI	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 18:32:53.941	2026-05-14 18:32:53.942
ce56d9cf-cc65-4741-9326-5236e06b8bc8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODM2MDEsImV4cCI6MTc3OTM4ODQwMX0.BDMr8_8dI-Icvk1S-5IhX_2cjHlElYh65oKyIf1mb1I	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 18:33:21.495	2026-05-14 18:33:21.496
be4cf750-6495-431a-9b6d-b215fb56d570	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODQyMzIsImV4cCI6MTc3OTM4OTAzMn0.4D6pP1MioQk33oTXAtHQgMAIvA8FN_ZQ2ctZ5rkocvs	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 18:43:52.748	2026-05-14 18:43:52.749
23ddde93-e71d-4bdb-9031-26b54ada25f8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODYzNjYsImV4cCI6MTc3OTM5MTE2Nn0.lIKaoghQppGlcrpTv1RkR5o1jXmLMrEBTVVry6LguxU	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:19:26.264	2026-05-14 19:19:26.266
f4a8dabd-dc51-46e6-b8c9-365eca8b248a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODYzNzIsImV4cCI6MTc3OTM5MTE3Mn0.-DdG2BSCQCvWo_ABuitpj-b-tY7Cq1HMMlhJZT1mwlc	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:19:32.135	2026-05-14 19:19:32.136
2ea87cfe-ebdf-4a6c-8ef4-e9718beb305b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODcwNTYsImV4cCI6MTc3OTM5MTg1Nn0.dERl64fN10jltaZiuBQnFLv2W-14FXNxWbepG74DFwU	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:30:56.576	2026-05-14 19:30:56.577
f49187f8-af4c-477f-8804-8ac4aa0db861	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJpYXQiOjE3Nzg3ODcyMjgsImV4cCI6MTc3OTM5MjAyOH0.RyAdyeKHr4Ym1eb05coQaiQunNorb4EVza_llR5hlTE	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:33:48.368	2026-05-14 19:33:48.368
03a8f8b3-1f0f-4c4b-a5c2-2539041be160	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODcyNTAsImV4cCI6MTc3OTM5MjA1MH0.fs0xYj0sXxlq43tVRiOQUp0acTs8zBif1XrZJGuOWXE	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:34:10.238	2026-05-14 19:34:10.239
d0977524-43fd-4f2d-ba28-0e2361899709	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODczNDAsImV4cCI6MTc3OTM5MjE0MH0.9aHZNN7lkJXCVE_47TkHSLAp1kqdp7-w5sBdQay597Y	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:35:40.822	2026-05-14 19:35:40.823
504111cc-9424-4019-a061-fb60683fd268	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODczNTIsImV4cCI6MTc3OTM5MjE1Mn0.fA_EthkmLBcYnzJkDk0hegCgRoVUer6awgjn1ZlYUs8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:35:52.445	2026-05-14 19:35:52.446
515750ae-3e8e-464b-9338-c54986e670a4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJpYXQiOjE3Nzg3ODczNjAsImV4cCI6MTc3OTM5MjE2MH0.cFNx_j0sMia8AC5WsQDdyZN5b5eOteZ-y_SV5KbuiMs	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:36:00.635	2026-05-14 19:36:00.636
1d1de9ae-2500-44a8-9eee-7c10a1d37daf	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJpYXQiOjE3Nzg3ODczOTQsImV4cCI6MTc3OTM5MjE5NH0.QjEfu4zVebaKynd1QeysTR0ptAIaj_EtPrMsZNj10qM	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:36:34.897	2026-05-14 19:36:34.898
7f301212-90be-4077-86f8-ce121a2627bc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODgzMjYsImV4cCI6MTc3OTM5MzEyNn0.ZFrCdQD4JJnM5N0N71DYljfpGlQSl2xqzEd0NjUuulQ	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:52:06.569	2026-05-14 19:52:06.57
1633a9af-f773-412a-b4f7-f4e81cd671d8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODgzMzksImV4cCI6MTc3OTM5MzEzOX0.6MszhWcIz9UxMxIrDwmyt-0yOcjeWWht3tv6_7PUQD8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:52:19.799	2026-05-14 19:52:19.801
4caaff9f-3540-4602-8b9a-e062663b0864	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODg1ODMsImV4cCI6MTc3OTM5MzM4M30.NbS3NSJb77DNgcBM4p2tqIb5lav0Vh_n3qXeu56_cEM	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:56:23.373	2026-05-14 19:56:23.374
e45c391c-a69c-4a4d-9c95-ff6545163c9c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODg2NDcsImV4cCI6MTc3OTM5MzQ0N30.kfhlhHr0jB7RKQEeNWNpWvm19_hrPLAwvgCs-zMB-p8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:57:27.331	2026-05-14 19:57:27.332
f8b00d50-c765-4330-a347-55ac86f94584	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODg2OTYsImV4cCI6MTc3OTM5MzQ5Nn0.lDjorYICEk73hP2tfNZm7iMsx0KlQuFlJoNxYrOqPn8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:58:16.616	2026-05-14 19:58:16.617
f572c980-1606-47b4-8839-c42bdbc0cf4a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODg3MDMsImV4cCI6MTc3OTM5MzUwM30.IP8CdXcuNZHXqye1M2CvW5Br0_aQKRomWIytLnXj7Vs	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 19:58:23.988	2026-05-14 19:58:23.989
d823e909-eea8-4e36-af55-3d995c0dd2ed	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODkyOTgsImV4cCI6MTc3OTM5NDA5OH0.pgwE6bNBdZ2v9-MB87cLsGUk1Wiwx6iUQK3ReMLZQPA	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:08:18.171	2026-05-14 20:08:18.172
e6513685-cf78-4511-a727-dbda38c4b729	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODkzMTAsImV4cCI6MTc3OTM5NDExMH0.hGjGXxTgeWxbtZW7783L-l6UmyrLRIr_abptIZPwu08	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:08:30.046	2026-05-14 20:08:30.047
fe7efdad-56ed-4052-94ea-c02c062b330f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODkzMTYsImV4cCI6MTc3OTM5NDExNn0.KVyPd-eNKiJ7FOQNXXarHx4xHtNNp48dDp-Vh79Enzk	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:08:36.011	2026-05-14 20:08:36.012
18bbfa03-2d83-47c4-8a54-652fb2468101	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODkzMjIsImV4cCI6MTc3OTM5NDEyMn0.3z0F2tUPxZGlP2P3SOoueng-LMFnktZeY2bN70HWbrs	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:08:42.737	2026-05-14 20:08:42.738
8597b992-a9f5-49c4-98a2-cdf640770a48	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODkzNzcsImV4cCI6MTc3OTM5NDE3N30.WjbGDAdjOGZ9SsWJNbIsYw1vSrkGGdGWNM-hysR4eng	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:09:37.687	2026-05-14 20:09:37.688
5d65fe47-a465-41e5-8421-1692f991e099	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3ODkzODYsImV4cCI6MTc3OTM5NDE4Nn0.ym4w_53aJnjQiMnpYTtW3ntrTh3xRn4LasDjOevFPA8	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:09:46.311	2026-05-14 20:09:46.312
5bed2549-29cc-4d98-b5bd-d55df09f729f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3OTAzNjIsImV4cCI6MTc3OTM5NTE2Mn0.8uvQT5blfopg-jd7DufvXrkTmKCTciE-UU8uXbgWysw	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:26:02.71	2026-05-14 20:26:02.711
f6940634-17ee-4792-96c2-66509a059b9c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3OTA0MTcsImV4cCI6MTc3OTM5NTIxN30.WzWL87H913kvJrZ63LlnDfnmXh8u4QK3KIUlcPtvtVA	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:26:57.278	2026-05-14 20:26:57.279
3dd94c50-159b-47a3-af58-1dc46817881d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3OTA0MjQsImV4cCI6MTc3OTM5NTIyNH0.LYCQ9TM0NvFxRUso61EjI70nrp53rx8llEUh9pIeL88	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:27:04.312	2026-05-14 20:27:04.313
972a91f0-a4f6-45f9-9d08-d411e3695846	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3OTA0NzAsImV4cCI6MTc3OTM5NTI3MH0.JFJd9nrWL1o3PjiMe2JrXJh67J6SJzAnCm50bWV7raU	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:27:50.183	2026-05-14 20:27:50.184
32e811c4-7225-4e8c-b5c1-a7f99b968a13	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3OTEyNTIsImV4cCI6MTc3OTM5NjA1Mn0.06DK3mAISNT_FEG7y3en0r2NCMOb9FWAU_b0U5QCV9E	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:40:52.033	2026-05-14 20:40:52.034
75125737-a574-453a-87cb-ed7999528ad7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3OTEzOTgsImV4cCI6MTc3OTM5NjE5OH0.1fBC2yeWy2taZMjO4u2Xj8Ce335bsIKblb0Uloj1hfY	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 20:43:18.196	2026-05-14 20:43:18.197
fa5f5982-fc6f-4a8b-b8da-66c10317a6b6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg3OTg3NTMsImV4cCI6MTc3OTQwMzU1M30.wshjrpYRWN53lhrIRp312hfeJ5kv5LRaTNEmoYPh1OY	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-21 22:45:53.938	2026-05-14 22:45:53.939
ccc776a9-1c8a-494b-92b4-071afddc03fc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg3OTg3NTQsImV4cCI6MTc3OTQwMzU1NH0.sS2phRUzpKhNdtbTYZw3Ryczbrm2XlgvD6GO6Ats_yw	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-21 22:45:54.282	2026-05-14 22:45:54.283
12b114c8-eee1-4595-9111-acfae7571b0b	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg4NDIwMTUsImV4cCI6MTc3OTQ0NjgxNX0.iWQ0ogN0zyzL6KjgnZaWEgIPF3UWC88rFp_FQWz30CM	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-22 10:46:55.728	2026-05-15 10:46:55.729
fac993ac-4ac2-4338-89ae-c7f06885e5ae	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJpYXQiOjE3Nzg4NTE3MTIsImV4cCI6MTc3OTQ1NjUxMn0.obK2ygoQKOlAIp-0tMQPyyGoHLPb_D1Q72XdvYX-Llw	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-22 13:28:32.256	2026-05-15 13:28:32.258
929b2208-7458-4797-9c42-7a9c00bb60d4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJpYXQiOjE3Nzg4NTE5OTUsImV4cCI6MTc3OTQ1Njc5NX0.Bwov8wSk6GE8kZEiPjaKOkVtbPXYCq6FuoWez215wHI	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-22 13:33:15.782	2026-05-15 13:33:15.783
19804edd-aeac-46b8-b4ac-582877f74204	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg4NTIwNDgsImV4cCI6MTc3OTQ1Njg0OH0.NKUuTFfnNGqo-bUehbykYRuK67YTlA5xn2oNBQaVCPU	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-22 13:34:08.426	2026-05-15 13:34:08.427
62a5c8dc-fd5e-476c-8528-deec4c5b7e96	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg4NTIxMzQsImV4cCI6MTc3OTQ1NjkzNH0.mEAZrqihrDEVA0SVrMIn475TqNX0UExQSDKLrGYvYbM	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-22 13:35:34.381	2026-05-15 13:35:34.382
4f80365a-dba2-4986-a9e1-d833efa25188	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg4NTIxNTgsImV4cCI6MTc3OTQ1Njk1OH0.Pdmf2ffYdlt5RwPXtP4JJW2LSWKZUIn2rpsN-2tHpcU	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-22 13:35:58.652	2026-05-15 13:35:58.653
0d119e7b-e251-4f17-b5ce-d809a029f96c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YWJmOGQ1OC1kMjBkLTQ2ZjgtODc1ZC1hODkyMjZkZWI2MTIiLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJuYW1lIjoiU3VwZXIgQWRtaW4iLCJpYXQiOjE3Nzg4NTIyOTksImV4cCI6MTc3OTQ1NzA5OX0.MrFT3K_6i0qWzxmhA2xz2LNB_AZ5IQ_oTIwov12mUGk	5abf8d58-d20d-46f8-875d-a89226deb612	2026-05-22 13:38:19.067	2026-05-15 13:38:19.069
7b05e5e1-0e01-4a3f-8611-c45be82dbcea	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwZWMxZDEzOS1iODI4LTQ5Y2MtOTU0ZC1kN2QyNTEwZmU4ZTgiLCJyb2xlIjoiQ09ORE9NSU5JVU1fQURNSU4iLCJuYW1lIjoiQXRlbmRpbWVudG8gVmVyZWRhcyBkbyBCb3NxdWUiLCJpYXQiOjE3Nzg4NTI1NzgsImV4cCI6MTc3OTQ1NzM3OH0.cLxzO5WHQeAcGPzlvo8sYeUWCmxkteId9GzzYH29mcg	0ec1d139-b828-49cc-954d-d7d2510fe8e8	2026-05-22 13:42:58.326	2026-05-15 13:42:58.327
\.


--
-- Data for Name: renovation_providers; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.renovation_providers (id, "renovationId", name, "serviceType", document, phone, company, "createdAt") FROM stdin;
\.


--
-- Data for Name: renovations; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.renovations (id, "unitId", "condominiumId", description, type, "startDate", "endDate", status, "approvedBy", "approvedAt", "rejectedReason", notes, "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.reservations (id, "commonAreaId", "unitId", "requestedBy", title, "startDate", "endDate", "guestCount", status, "approvedBy", "canceledBy", "cancelReason", notes, "createdAt", "updatedAt") FROM stdin;
ec1797d8-5a4c-45ca-88cd-4d1649f50c5e	seed-area-001	45b3f803-9747-4527-b8e5-a7b9776944d8	4bf33a9c-4bf1-49e6-ba24-1518eeb4b306	\N	2026-05-04 21:00:00	2026-05-05 02:00:00	\N	COMPLETED	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	\N	Anivers├írio da filha	2026-05-12 01:11:02.589	2026-05-12 01:11:02.589
a6ee32e6-04c0-44ba-80ef-006b050ea8d4	seed-area-001	78bdbbac-6ceb-4611-9073-7221f97b3d8e	94d13791-78ed-49bb-8f9d-62c92e04a5e1	\N	2026-05-08 19:00:00	2026-05-09 01:00:00	\N	COMPLETED	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	\N	Confraterniza├º├úo	2026-05-12 01:11:02.594	2026-05-12 01:11:02.594
2734e3fd-c677-4ad4-8901-c198903a9ee5	seed-area-002	a494513d-4f53-4c1a-a8b3-2baf4afe4097	d7aac45d-8c79-4a99-b32c-6cb7ad022c22	\N	2026-05-10 11:00:00	2026-05-10 13:00:00	\N	COMPLETED	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	\N	Treino de futebol	2026-05-12 01:11:02.597	2026-05-12 01:11:02.597
ce1cc07d-2971-45c6-8b67-346380ca6de4	seed-area-002	2951fed8-9753-4307-a0e5-51625785922e	b2297fd8-a82b-4c8c-b321-b5c8a0f8d178	\N	2026-05-12 10:00:00	2026-05-12 12:00:00	\N	CONFIRMED	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	\N	Jogo com vizinhos	2026-05-12 01:11:02.6	2026-05-12 01:11:02.6
aef552bc-7420-49ef-bd41-34cb2fdc33db	seed-area-001	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	9770990d-553c-42c8-a2b6-c7939a4217ee	\N	2026-05-14 20:00:00	2026-05-15 01:00:00	\N	PENDING	\N	\N	\N	Festa de formatura	2026-05-12 01:11:02.603	2026-05-12 01:11:02.603
0e3a5097-06c3-4ce9-8caa-a7766c0d8d5a	seed-area-002	45b3f803-9747-4527-b8e5-a7b9776944d8	4bf33a9c-4bf1-49e6-ba24-1518eeb4b306	\N	2026-05-16 11:00:00	2026-05-16 13:00:00	\N	CONFIRMED	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	\N		2026-05-12 01:11:02.606	2026-05-12 01:11:02.606
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.role_permissions (id, role, "permissionId", "condominiumId") FROM stdin;
\.


--
-- Data for Name: service_order_checklists; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.service_order_checklists (id, "serviceOrderId", item, "isDone", "doneAt", notes) FROM stdin;
\.


--
-- Data for Name: service_orders; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.service_orders (id, "unitId", "condominiumId", "requestedBy", "assignedTo", "serviceProviderId", title, description, category, location, priority, status, "photoUrls", "estimatedCost", "finalCost", "scheduledAt", "startedAt", "completedAt", resolution, rating, feedback, "createdAt", "updatedAt") FROM stdin;
4dfd5919-9ac2-420d-b031-806d2a667a06	45b3f803-9747-4527-b8e5-a7b9776944d8	bf201f72-9858-4a6f-960e-c55260becb1d	4bf33a9c-4bf1-49e6-ba24-1518eeb4b306	\N	\N	Vazamento na cozinha	Cano sob a pia com vazamento constante	hidr├íulica	\N	HIGH	COMPLETED	\N	338.80	219.38	\N	\N	2026-05-03 15:00:00	Troca do sif├úo e veda├º├úo com silicone	\N	\N	2026-05-01 15:00:00	2026-05-12 01:11:02.467
f4893d82-c4c6-435b-af52-e741950bb843	78bdbbac-6ceb-4611-9073-7221f97b3d8e	bf201f72-9858-4a6f-960e-c55260becb1d	94d13791-78ed-49bb-8f9d-62c92e04a5e1	\N	\N	Torneira do banheiro pingando	Torneira com desgaste no vedante	hidr├íulica	\N	LOW	COMPLETED	\N	217.51	399.84	\N	\N	2026-05-05 15:00:00	Substitui├º├úo do reparo interno	\N	\N	2026-05-04 15:00:00	2026-05-12 01:11:02.471
f96433cf-03e0-487b-afb7-fb62244f29d2	a494513d-4f53-4c1a-a8b3-2baf4afe4097	bf201f72-9858-4a6f-960e-c55260becb1d	d7aac45d-8c79-4a99-b32c-6cb7ad022c22	c7967c6e-846e-47fd-a747-b1e23bbed4b1	\N	Tomada queimada na sala	Tomada com fa├¡sca e sem funcionamento	el├®trica	\N	MEDIUM	IN_PROGRESS	\N	\N	\N	2026-05-12 11:00:00	\N	\N	\N	\N	\N	2026-05-08 15:00:00	2026-05-12 01:11:02.475
fd7473ef-d2af-4239-b6c5-8945c53820af	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	bf201f72-9858-4a6f-960e-c55260becb1d	b2297fd8-a82b-4c8c-b321-b5c8a0f8d178	\N	\N	Port├úo eletr├┤nico com falha	Port├úo abre mas n├úo fecha corretamente	el├®trica	\N	URGENT	OPEN	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-10 15:00:00	2026-05-12 01:11:02.478
cbbabe0d-50e4-4e27-bb25-80bb06579704	2951fed8-9753-4307-a0e5-51625785922e	bf201f72-9858-4a6f-960e-c55260becb1d	9770990d-553c-42c8-a2b6-c7939a4217ee	\N	\N	L├ómpada queimada corredor Bl A	Lumin├íria do corredor bloco A piso 2 apagada	el├®trica	\N	LOW	OPEN	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-11 20:11:02.465	2026-05-12 01:11:02.481
d19afc67-8d0e-4c33-a008-9b73ddbb118e	b256faa7-8e04-436d-8dce-bbddb7e27a67	bf201f72-9858-4a6f-960e-c55260becb1d	4bf33a9c-4bf1-49e6-ba24-1518eeb4b306	\N	\N	Infiltra├º├úo no teto da garagem	├ügua escorrendo pelo teto pr├│ximo ├á vaga 08	civil	\N	HIGH	IN_PROGRESS	\N	\N	\N	2026-05-12 13:00:00	\N	\N	\N	\N	\N	2026-05-06 15:00:00	2026-05-12 01:11:02.483
e9001399-b68a-4926-a086-0548d41d3ace	6c0fa490-7e81-4c78-83ce-636e2f9dfa70	bf201f72-9858-4a6f-960e-c55260becb1d	94d13791-78ed-49bb-8f9d-62c92e04a5e1	\N	\N	Pintura da ├írea de lazer	Paredes desgastadas na ├írea de lazer	pintura	\N	LOW	OPEN	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-09 15:00:00	2026-05-12 01:11:02.491
\.


--
-- Data for Name: service_providers; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.service_providers (id, "condominiumId", name, cnpj, cpf, "serviceType", phone, email, "isApproved", notes, "createdAt", "updatedAt", "photoUrl") FROM stdin;
1e291ec0-bbd0-4d37-84bb-39ca23ccf553	bf201f72-9858-4a6f-960e-c55260becb1d	Andr├® Poda de Arvores	\N	\N	Pode e jardinagem	(62) 99999-9999	andre@pod.com.br	f	\N	2026-05-12 01:35:05.123	2026-05-12 01:35:05.123	\N
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.stock_items (id, "condominiumId", name, description, category, unit, quantity, "minQuantity", location, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.stock_movements (id, "itemId", type, quantity, reason, "performedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: ticket_messages; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.ticket_messages (id, "ticketId", "senderId", content, "createdAt") FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.tickets (id, "condominiumId", title, category, priority, status, "createdById", "assignedToId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.units (id, "condominiumId", identifier, block, street, floor, type, area, bedrooms, status, fraction, notes, "createdAt", "updatedAt") FROM stdin;
63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 04	Rua 03	\N	\N	Casa	150	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.201
b9e43b37-9d0c-4506-9e53-81c0fb19b2a9	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 42	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.174	2026-05-13 14:18:49.354
0da75953-6099-4b0e-b392-a1ebe6de2b04	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 45	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.189	2026-05-13 14:18:49.365
bde6008f-2158-425a-88c9-4fefe3e273ad	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 47	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.198	2026-05-13 14:18:49.373
90ed3f50-d8a5-4dd5-a047-ec60467e5c7e	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 48	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.202	2026-05-13 14:18:49.377
5630c66a-5ac6-4870-aacd-978423dd09a3	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 49	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.206	2026-05-13 14:18:49.38
13ad9b30-7728-4f16-8b14-102c15481ad6	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 50	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.21	2026-05-13 14:18:49.384
1255a388-b5d4-4b79-8218-d8ba2f423990	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 51	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.214	2026-05-13 14:18:49.389
f6ac4ca9-ad0b-4de9-96b1-9cb48a6738e6	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 52	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.219	2026-05-13 14:18:49.393
f761af34-ea22-4ea6-b1b5-1e5d72670fd0	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 53	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.222	2026-05-13 14:18:49.405
62b6027e-c5b6-47f7-8788-f908cc90eb00	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 54	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.226	2026-05-13 14:18:49.41
5f9e5b50-a926-4374-a4ce-4a5bff220010	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 55	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.234	2026-05-13 14:18:49.415
88eca4fe-fb64-4891-8b2d-db1835029bb5	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 56	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.239	2026-05-13 14:18:49.422
60e59e98-f334-4a44-b7d8-36b38f895e13	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 57	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.242	2026-05-13 14:18:49.427
e6a11a70-a769-401b-82f3-395f94006470	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 58	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.247	2026-05-13 14:18:49.432
83b86f08-900c-423d-a408-e5e1fce9f115	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 59	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.251	2026-05-13 14:18:49.438
62e4981b-1701-4046-9b87-b1fb829639df	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 60	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.255	2026-05-13 14:18:49.443
c08a4203-725d-4b7b-84b2-e2deef8eb614	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 61	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.259	2026-05-13 14:18:49.447
ee042cd5-b7ed-457d-9719-a7c3f888ba13	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 63	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.267	2026-05-13 14:18:49.457
e94f35b2-595b-4ac0-b002-b935f6d9c737	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 64	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.271	2026-05-13 14:18:49.462
78bdbbac-6ceb-4611-9073-7221f97b3d8e	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 02	Rua 03	\N	\N	Casa	130	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.194
1ce53e1e-a8a8-46b9-a769-eaab81070211	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 08	Rua 03	\N	\N	Casa	190	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.221
b184c3ab-8dbd-4bb4-b6d2-16e451b5e3b0	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 10	Rua 03	\N	\N	Casa	210	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.229
ebecc098-de21-454f-8272-2c68d65f9128	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 43	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.18	2026-05-13 14:18:49.358
abb8071c-8c30-48a9-8ded-4cc99fbcf824	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 46	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.193	2026-05-13 14:18:49.368
45b3f803-9747-4527-b8e5-a7b9776944d8	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 01	Rua 03	\N	\N	Casa	120	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.181
a494513d-4f53-4c1a-a8b3-2baf4afe4097	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 03	Rua 03	\N	\N	Casa	140	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.198
e36b4626-500a-4c07-82f9-a1c3cec89fe2	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 09	Rua 03	\N	\N	Casa	200	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.225
b256faa7-8e04-436d-8dce-bbddb7e27a67	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 06	Rua 03	\N	\N	\N	170	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.211
11d42ae5-2a36-4f5d-b871-015a97324461	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 11	Rua 03	\N	\N	Casa	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.027	2026-05-13 14:18:49.233
1c46c0a6-e2ce-4c9b-915f-aca8110b002a	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 13	Rua 03	\N	\N	Casa	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.039	2026-05-13 14:18:49.243
f06836d9-9f9a-4c09-846c-ba16fead95ce	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 14	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.043	2026-05-13 14:18:49.247
27b0c2c7-0c72-419b-9cdb-4dc303bc5abd	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 15	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.049	2026-05-13 14:18:49.25
ae9fc1b3-af61-4a61-82ec-7a71f94c65ed	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 16	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.054	2026-05-13 14:18:49.255
38b4b717-493d-42e9-b4cb-4703d526225a	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 17	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.058	2026-05-13 14:18:49.26
7a0e5e45-7ff4-4733-aade-67b853ab6517	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 18	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.063	2026-05-13 14:18:49.263
1a7534de-cc1f-48ad-ae82-720407a5c46d	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 19	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.068	2026-05-13 14:18:49.266
0ea95009-b6e0-4e6a-b9fc-691742b42796	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 20	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.072	2026-05-13 14:18:49.271
b6f24179-8ad5-4a10-82aa-1588e4f735ff	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 21	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.076	2026-05-13 14:18:49.275
9170bdc6-2862-4a03-a59d-8e2cfb9d611c	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 22	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.08	2026-05-13 14:18:49.28
8d31d662-27c3-4da9-959e-1f948a3cdbbf	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 23	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.085	2026-05-13 14:18:49.283
a2b7fdef-671e-4f14-8635-363eed15892a	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 24	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.089	2026-05-13 14:18:49.288
1cde202c-af8b-4ed7-ae5b-d98979b9c839	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 25	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.095	2026-05-13 14:18:49.292
a2988e7a-b077-443f-a4af-5c8a4b180d44	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 27	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.105	2026-05-13 14:18:49.298
59464d44-fcfb-49c1-b89f-f4d0da25a1ec	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 28	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.109	2026-05-13 14:18:49.302
21ccc564-2775-432e-9770-2da727e4d6be	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 29	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.114	2026-05-13 14:18:49.307
36938469-d050-435d-9712-4528f99c9233	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 30	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.119	2026-05-13 14:18:49.31
ac40491d-efc1-44e3-bb6d-e9ad19f75816	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 31	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.124	2026-05-13 14:18:49.314
6e956bed-d090-43e6-85e5-7273396e27cb	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 32	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.129	2026-05-13 14:18:49.317
6a122599-02ca-4e2a-a59a-145838c6b158	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 33	Rua 02	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.134	2026-05-13 14:18:49.321
d773a8d8-cac3-4c7a-9113-ff801a9248e9	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 34	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.138	2026-05-13 14:18:49.325
31847c5f-a17e-43de-a5ab-4a7f4de7cd26	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 35	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.142	2026-05-13 14:18:49.328
536a52e6-5350-4d52-b39f-d4e220afb224	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 36	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.147	2026-05-13 14:18:49.331
7c8e8ae9-bc34-439b-9c37-afc089bd2045	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 37	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.151	2026-05-13 14:18:49.335
82ebd51d-0e0d-4ced-91ce-bb7f5e508e3f	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 38	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.156	2026-05-13 14:18:49.34
f413f8a1-5f8a-49d8-9ab3-4f84ac3ec103	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 39	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.16	2026-05-13 14:18:49.343
4152fb67-1bfd-4b8e-9687-d0dd9b63091b	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 40	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.165	2026-05-13 14:18:49.346
1f8353fd-f919-4c4e-992e-3fa0583912ac	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 41	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.17	2026-05-13 14:18:49.349
615a6f92-1d40-48d6-badf-a3c51fc73ff9	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 12	Rua 03	\N	\N	Casa	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.034	2026-05-13 14:40:27.87
2951fed8-9753-4307-a0e5-51625785922e	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 05	Rua 03	\N	\N	Casa	160	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.206
6c0fa490-7e81-4c78-83ce-636e2f9dfa70	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 07	Rua 03	\N	\N	Casa	180	3	OCCUPIED	1.000000	\N	2026-05-12 01:10:34.526	2026-05-13 14:18:49.216
3f0fefc6-d750-49a0-bd7e-c1514e38d0f1	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 26	Rua 02	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.101	2026-05-13 14:18:49.295
b7f217ef-cb87-42b9-8104-4067ed23be6b	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 44	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.185	2026-05-13 14:18:49.362
053a734b-8c38-41da-9eb8-a1d84594130d	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 62	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.263	2026-05-13 14:18:49.451
adb3a0bf-9377-4214-a645-da6559b6c4f8	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 65	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.275	2026-05-13 14:18:49.466
4d459014-f897-45aa-83cf-5637b1064279	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 66	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.279	2026-05-13 14:18:49.473
e00896dd-ad7c-4930-851f-6001ee329f5b	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 67	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.284	2026-05-13 14:18:49.478
7ed34f7c-9ba4-4359-97a9-e38cddfd78b7	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 68	Rua 01	\N	\N	\N	\N	\N	OCCUPIED	1.000000	\N	2026-05-12 01:11:29.288	2026-05-13 14:18:49.481
7acf0caf-f280-458a-a5a6-410e05112209	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 69	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.292	2026-05-13 14:18:49.485
6040aa27-2ca4-4d3b-96d7-d28773984c61	bf201f72-9858-4a6f-960e-c55260becb1d	Casa 70	Rua 01	\N	\N	\N	\N	\N	VACANT	1.000000	\N	2026-05-12 01:11:29.296	2026-05-13 14:18:49.492
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.users (id, email, "passwordHash", name, phone, cpf, "avatarUrl", role, "isActive", "emailVerified", "twoFactorEnabled", "twoFactorSecret", "lastLoginAt", "createdAt", "updatedAt") FROM stdin;
5338be1a-1d63-4f39-904b-1d9aec6cf327	sindico@veredasdobosque.com.br	$2a$12$uy88.jyLU52IiuMbyX.xLeOuiLUQKEWQXkuLs5h7XPkK0Sq3Efk9a	Carlos Silva	(62) 99100-0001	\N	\N	SYNDIC	t	t	f	\N	\N	2026-05-12 14:50:02.301	2026-05-12 14:50:02.301
12f31d72-8876-4bed-9a44-dc4d91c2f82f	porteiro@veredasdobosque.com.br	$2a$12$gJPErcnMzL0zh4dusYffdeB.i74qjtJq1.jqh63Z06miEr8yq3Kym	Jo├úo Porteiro	(62) 99100-0002	\N	\N	DOORMAN	t	t	f	\N	\N	2026-05-12 14:50:02.67	2026-05-13 16:19:16.126
5abf8d58-d20d-46f8-875d-a89226deb612	admin@condosync.com.br	$2a$12$3gctGtfBe/fAbjsCB4JX8urbOXa9TTxr.n8ZWkH0q1fuHNfoDrmBy	Super Admin	\N	\N	\N	SUPER_ADMIN	t	t	f	\N	2026-05-15 13:38:19.077	2026-05-12 00:58:28.274	2026-05-15 13:38:19.078
0ec1d139-b828-49cc-954d-d7d2510fe8e8	atendimentoveredasbosque@gmail.com	$2a$12$HKKhtAcqJa.owd.OMGnf3uxAT2FS3lzLHa59aXfJfVD3u2Zu/TqC.	Atendimento Veredas do Bosque	(62) 99999-9999	\N	\N	CONDOMINIUM_ADMIN	t	f	f	\N	2026-05-15 13:42:58.331	2026-05-12 01:10:51.772	2026-05-15 13:42:58.332
5dd79b37-94ea-4b32-b746-1605b7cf29ae	santiagoti_sola@hotmail.com	$2a$12$VZb9SRI4S5rRpp/f0fNBIuLoAUNwVcaIXDFKdEOHvxFV8RCKFPTn6	Santiago Sola Neto	\N	\N	\N	RESIDENT	t	f	f	\N	2026-05-13 16:20:52.352	2026-05-12 01:23:56.391	2026-05-13 16:20:52.353
03825361-7ef3-4203-8720-ddd492b452ff	alexandre@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Alexandre Ferreira Abrao	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.276	2026-05-12 01:23:56.276
6737d086-44b2-4f05-9079-70f7dd05df61	aparecida@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Aparecida Ferreira Cardoso	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.292	2026-05-12 01:23:56.292
f1d95393-36a5-479d-a629-8ae156188e3d	bruno40@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Bruno Martins Suanno	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.299	2026-05-12 01:23:56.299
35a7cf5d-7c74-4405-b936-51281175a94b	flavio@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Flavio Augusto Curado Moraes	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.307	2026-05-12 01:23:56.307
e4fe03cf-bfec-4a73-b7ed-cccc36531628	haroldo@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Haroldo Pereira de Macedo	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.315	2026-05-12 01:23:56.315
1086bd2d-f916-46d8-918a-fda586e41e38	helber@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Helber Quintela Freitas	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.323	2026-05-12 01:23:56.323
5a94be4a-7d82-4b29-8904-90b106aa20cb	jean@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Jean Jose de Jesus	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.331	2026-05-12 01:23:56.331
102c209f-3d78-4d53-a75f-d1d29e260649	jesse@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Jesse Mendes de Andrade	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.34	2026-05-12 01:23:56.34
df8358bd-e3ee-4b48-9262-761d8adfa31b	jonathas@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Jonathas Matias de Carvalho	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.347	2026-05-12 01:23:56.347
1b8b8893-e9c0-4bb3-9f6e-818962dc9f25	karla@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Karla Maria Gomes Pontes	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.354	2026-05-12 01:23:56.354
6a353ce1-b949-459f-bacf-fcc158664b95	ketian@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Ketian Susan Pains Rodrigues Silva	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.362	2026-05-12 01:23:56.362
1ef8bdb5-6c5f-49c7-9dcb-28fdc460dcd9	livia@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Livia Vanessa de Freitas Martins	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.369	2026-05-12 01:23:56.369
d48ad5f2-1406-454e-aa93-ad938a2d8e91	marcio@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Marcio Caiado de Castro	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.377	2026-05-12 01:23:56.377
d16f2d57-61e5-42df-b864-f6a1599a6a98	karine12@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Karine Dias de Abreu	\N	\N	\N	SYNDIC	t	f	f	\N	\N	2026-05-12 01:23:56.383	2026-05-12 01:23:56.383
50bb509d-996b-4c5f-80d6-6e7aa4684175	maria11@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Maria Aparecida de Jesus Fernandes	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.397	2026-05-12 01:23:56.397
65250756-5061-4d7e-abe0-4040920ac24d	maria26@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Maria Izabel Rodrigues de Andrade	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.412	2026-05-12 01:23:56.412
edfdd051-1bab-45a3-a8bb-4c498d4d8a1e	marines@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Marines Honorato Pinheiro	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.418	2026-05-12 01:23:56.418
8c6659de-827c-4623-bf89-6f8d3f081ca5	matheus@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Matheus Cardoso Martins	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.426	2026-05-12 01:23:56.426
583d912a-0df1-4992-a708-e9216e7f7126	michel@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Michel Blezins de Arruda	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.432	2026-05-12 01:23:56.432
53644396-ae8c-4228-9b16-8ef3bd4ad21f	michelly@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Michelly Marcklin Goncalves	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.441	2026-05-12 01:23:56.441
a5b2b1fa-17bd-4021-862b-0843b74cb75a	murilo@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Murilo Jose do Carmo	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.449	2026-05-12 01:23:56.449
3cf0b20f-350b-4994-a4f0-bf6fe5a6e060	paulo@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Paulo Roberto Oliveira	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.458	2026-05-12 01:23:56.458
d747e5ca-c834-43fc-af8b-b0f4e1b35962	priscilla@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Priscilla Carvalho Ferreira Lima	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.468	2026-05-12 01:23:56.468
513f40e6-2c29-48a1-9d96-22dd1d53875c	rafaella@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Rafaella Neta dos Santos Fagundes	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.478	2026-05-12 01:23:56.478
51c42160-f54c-4b10-a74d-da40df4adce2	raimunda@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Raimunda Pereira da Silva	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.485	2026-05-12 01:23:56.485
8a9ead9d-8531-4ddb-ab3f-779c1af8471c	renata@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Renata Rodrigues de Lima	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.495	2026-05-12 01:23:56.495
f0805cb7-7f43-49af-843a-40165f5774d5	rodrigo@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Rodrigo Sartori Seltz	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.504	2026-05-12 01:23:56.504
f47efcb9-7ae6-4611-a380-f2be695945cc	selma@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Selma Ribeiro de Alencar	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.513	2026-05-12 01:23:56.513
1b2d9b16-bd0a-4425-8fb7-60fb997b2df3	sergey@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Sergey Robert Magalhaes	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.523	2026-05-12 01:23:56.523
bdb50e1f-c1d7-4e4c-ad81-8bb67d7bb0a0	sergio39@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Sergio Luciano Rodrigues de Oliveira	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.53	2026-05-12 01:23:56.53
a514534d-1257-4ef9-ae1a-713456ac2eaa	sergio37@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Sergio Marcelo Rodrigues de Oliveira	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.537	2026-05-12 01:23:56.537
9640f393-9658-43bb-89e0-10da4e8f1b9e	sidney@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Sidney Silva de Faria	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.545	2026-05-12 01:23:56.545
ba29cdd9-d618-4fd6-888b-3877bb05f997	thiago54@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Thiago de Oliveira Magalhaes	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.551	2026-05-12 01:23:56.551
17c4cf3a-6023-4810-be4d-b41c7c073dce	thiago44@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Thiago Semao Pires	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.559	2026-05-12 01:23:56.559
87e00b24-a9e8-44a9-a7cd-5717631a7ed4	victor@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Victor Cruz Pereira	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.566	2026-05-12 01:23:56.566
309400f2-1259-49fe-a157-7a03a5b32172	vinicius@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Vinicius Gontijo de Campos	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.574	2026-05-12 01:23:56.574
a3dcf4c5-ddb5-45a9-8ade-05c0c8882774	wiler@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Wiler Jose Borges Monteiro	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.581	2026-05-12 01:23:56.581
c497e64c-3743-414d-9fb9-03859d4bca9e	wilibaldo@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Wilibaldo de Sousa Neto	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.59	2026-05-12 01:23:56.59
75f89b75-723b-4aaf-ae77-afa375401cd8	winicius@gmail.com	$2a$12$cVrBFCIuGiS1dU.8qDzdVuIuoZaHMXbvJ837WysyVTzzFuQ/ze/p.	Winicius Ferreira de Oliveira	\N	\N	\N	RESIDENT	t	f	f	\N	\N	2026-05-12 01:23:56.597	2026-05-12 01:23:56.597
\.


--
-- Data for Name: vehicle_access_logs; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.vehicle_access_logs (id, "vehicleId", plate, "unitId", "isResident", "entryAt", "exitAt", notes, "registeredBy") FROM stdin;
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.vehicles (id, "unitId", plate, brand, model, color, year, type, "isActive", "createdAt", "updatedAt", "photoUrl") FROM stdin;
635467c6-31bd-46d2-b2b0-0d85a306d7a1	45b3f803-9747-4527-b8e5-a7b9776944d8	ABC1D23	Toyota	Corolla	Prata	2022	CAR	t	2026-05-12 01:11:02.45	2026-05-12 01:11:02.45	\N
3b91c3c5-4995-4474-8eab-10182cd3f319	78bdbbac-6ceb-4611-9073-7221f97b3d8e	DEF4E56	Honda	Civic	Preto	2021	CAR	t	2026-05-12 01:11:02.453	2026-05-12 01:11:02.453	\N
522621b7-1a40-44f7-a388-31bb67a8f10a	a494513d-4f53-4c1a-a8b3-2baf4afe4097	GHI7F89	Volkswagen	Gol	Branco	2020	CAR	t	2026-05-12 01:11:02.455	2026-05-12 01:11:02.455	\N
309d072c-b6c5-4869-b6ea-65565cc1bf20	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	JKL2G34	Fiat	Uno	Vermelho	2019	CAR	t	2026-05-12 01:11:02.458	2026-05-12 01:11:02.458	\N
4f5dcc0d-5b14-4bda-bc64-399a485f8f9c	2951fed8-9753-4307-a0e5-51625785922e	MNO5H67	Honda	CG 160	Preta	2023	MOTORCYCLE	t	2026-05-12 01:11:02.461	2026-05-12 01:11:02.461	\N
d9749d60-5696-4575-9629-177d441b64d9	b256faa7-8e04-436d-8dce-bbddb7e27a67	PQR8I90	Yamaha	Factor	Azul	2022	MOTORCYCLE	t	2026-05-12 01:11:02.464	2026-05-12 01:11:02.464	\N
\.


--
-- Data for Name: visitor_qrcode_uses; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.visitor_qrcode_uses (id, "qrcodeId", "visitorId", "scannedAt", "scannedBy") FROM stdin;
\.


--
-- Data for Name: visitor_qrcodes; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.visitor_qrcodes (id, "unitId", "createdBy", "visitorName", "visitorDoc", "visitorPhone", reason, "validFrom", "validUntil", "maxUses", "usedCount", token, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: visitor_recurrences; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.visitor_recurrences (id, "condominiumId", "unitId", "visitorName", document, "documentType", company, reason, "weekDays", "startTime", "endTime", "validFrom", "validUntil", "isActive", "createdBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: visitors; Type: TABLE DATA; Schema: public; Owner: condosync
--

COPY public.visitors (id, "unitId", name, document, "documentType", phone, "photoUrl", company, reason, "preAuthorizedBy", status, "scheduledAt", "entryAt", "exitAt", "registeredBy", notes, "createdAt", "updatedAt", "serviceProviderId") FROM stdin;
8e73803e-3ff7-4f2a-bd09-7b9f2d0195d8	45b3f803-9747-4527-b8e5-a7b9776944d8	Marcos Pereira	111.222.333-44	CPF	\N	\N	\N	Visita familiar	4bf33a9c-4bf1-49e6-ba24-1518eeb4b306	LEFT	\N	2026-05-09 17:00:00	2026-05-09 20:00:00	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	2026-05-12 01:11:02.413	2026-05-12 01:11:02.413	\N
b15dc4b1-42b6-46ce-b58d-b7d1ab314d14	78bdbbac-6ceb-4611-9073-7221f97b3d8e	Fernanda Lima	MG-1234567	RG	\N	\N	\N	Entrega de documentos	94d13791-78ed-49bb-8f9d-62c92e04a5e1	LEFT	\N	2026-05-10 13:00:00	2026-05-10 14:00:00	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	2026-05-12 01:11:02.417	2026-05-12 01:11:02.417	\N
fd177a49-d5b9-44ea-af69-410287514a97	a494513d-4f53-4c1a-a8b3-2baf4afe4097	Ricardo Souza	555.666.777-88	CPF	\N	\N	\N	Reuni├úo de neg├│cios	d7aac45d-8c79-4a99-b32c-6cb7ad022c22	LEFT	\N	2026-05-10 18:00:00	2026-05-10 19:00:00	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	2026-05-12 01:11:02.42	2026-05-12 01:11:02.42	\N
dcd5f48d-865b-4f71-9eab-000dd45ba6d2	63ed72d6-e564-49c4-ba2b-2d9000f4e5ac	Juliana Travolta	SP-9876543	RG	\N	\N	\N	Visita social	b2297fd8-a82b-4c8c-b321-b5c8a0f8d178	INSIDE	\N	2026-05-12 00:11:02.411	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	2026-05-12 01:11:02.423	2026-05-12 01:11:02.423	\N
9758e0b6-93f9-48ec-85b6-7471c4ffb706	2951fed8-9753-4307-a0e5-51625785922e	Pedro Almeida	999.888.777-66	CPF	\N	\N	\N	Entrega de presente	9770990d-553c-42c8-a2b6-c7939a4217ee	AUTHORIZED	\N	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	2026-05-12 01:11:02.427	2026-05-12 01:11:02.427	\N
1abf730b-7947-43e9-9471-ed3636ecb800	b256faa7-8e04-436d-8dce-bbddb7e27a67	Camila Rodrigues	321.654.987-01	CPF	\N	\N	\N	Servi├ºo de internet	4bf33a9c-4bf1-49e6-ba24-1518eeb4b306	PENDING	2026-05-12 12:00:00	\N	\N	63dd37bf-8b3d-45b4-b416-efad1b067fc0	\N	2026-05-12 01:11:02.43	2026-05-12 01:11:02.43	\N
2b202eca-3d1c-4e87-9717-d49fd7fcf0ce	615a6f92-1d40-48d6-badf-a3c51fc73ff9	Maria da Silva	12.345.678-9	RG	(62) 98888-1234	\N		Visita familiar - teste integra├º├úo	\N	LEFT	\N	2026-05-13 16:23:20.554	2026-05-14 18:48:40.261	0ec1d139-b828-49cc-954d-d7d2510fe8e8	\N	2026-05-13 16:22:48.641	2026-05-14 18:48:40.262	\N
13d7e698-0995-4cf0-8797-743841ff722d	615a6f92-1d40-48d6-badf-a3c51fc73ff9	joao avelange	32121231231	RG	(62) 9999-9999	\N	actsd	almo├ºo	\N	LEFT	\N	2026-05-14 18:48:41.777	2026-05-14 18:56:49.852	0ec1d139-b828-49cc-954d-d7d2510fe8e8	\N	2026-05-13 11:01:23.261	2026-05-14 18:56:49.853	\N
400eef8c-aac3-41c7-a125-f2bd849ca619	615a6f92-1d40-48d6-badf-a3c51fc73ff9	joao losa	31255222	RG	(62) 99999-9999	\N		reunio cafe da manha	\N	INSIDE	\N	2026-05-14 18:56:54.779	\N	0ec1d139-b828-49cc-954d-d7d2510fe8e8	\N	2026-05-13 10:47:56.579	2026-05-14 18:56:54.78	\N
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: area_blocked_periods area_blocked_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.area_blocked_periods
    ADD CONSTRAINT area_blocked_periods_pkey PRIMARY KEY (id);


--
-- Name: assemblies assemblies_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assemblies
    ADD CONSTRAINT assemblies_pkey PRIMARY KEY (id);


--
-- Name: assembly_attendees assembly_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assembly_attendees
    ADD CONSTRAINT assembly_attendees_pkey PRIMARY KEY (id);


--
-- Name: assembly_votes assembly_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assembly_votes
    ADD CONSTRAINT assembly_votes_pkey PRIMARY KEY (id);


--
-- Name: assembly_voting_items assembly_voting_items_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assembly_voting_items
    ADD CONSTRAINT assembly_voting_items_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: charges charges_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.charges
    ADD CONSTRAINT charges_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: collection_rules collection_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.collection_rules
    ADD CONSTRAINT collection_rules_pkey PRIMARY KEY (id);


--
-- Name: collection_steps collection_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.collection_steps
    ADD CONSTRAINT collection_steps_pkey PRIMARY KEY (id);


--
-- Name: common_areas common_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.common_areas
    ADD CONSTRAINT common_areas_pkey PRIMARY KEY (id);


--
-- Name: condominium_contracts condominium_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominium_contracts
    ADD CONSTRAINT condominium_contracts_pkey PRIMARY KEY (id);


--
-- Name: condominium_documents condominium_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominium_documents
    ADD CONSTRAINT condominium_documents_pkey PRIMARY KEY (id);


--
-- Name: condominium_users condominium_users_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominium_users
    ADD CONSTRAINT condominium_users_pkey PRIMARY KEY (id);


--
-- Name: condominiums condominiums_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominiums
    ADD CONSTRAINT condominiums_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: dependents dependents_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.dependents
    ADD CONSTRAINT dependents_pkey PRIMARY KEY (id);


--
-- Name: digital_signage_screens digital_signage_screens_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.digital_signage_screens
    ADD CONSTRAINT digital_signage_screens_pkey PRIMARY KEY (id);


--
-- Name: digital_signage_slides digital_signage_slides_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.digital_signage_slides
    ADD CONSTRAINT digital_signage_slides_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: finalized_assemblies finalized_assemblies_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.finalized_assemblies
    ADD CONSTRAINT finalized_assemblies_pkey PRIMARY KEY (id);


--
-- Name: financial_accounts financial_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT financial_accounts_pkey PRIMARY KEY (id);


--
-- Name: financial_categories financial_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.financial_categories
    ADD CONSTRAINT financial_categories_pkey PRIMARY KEY (id);


--
-- Name: financial_transactions financial_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT financial_transactions_pkey PRIMARY KEY (id);


--
-- Name: fines fines_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.fines
    ADD CONSTRAINT fines_pkey PRIMARY KEY (id);


--
-- Name: lost_and_found lost_and_found_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.lost_and_found
    ADD CONSTRAINT lost_and_found_pkey PRIMARY KEY (id);


--
-- Name: maintenance_schedules maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT maintenance_schedules_pkey PRIMARY KEY (id);


--
-- Name: marketplace_offers marketplace_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.marketplace_offers
    ADD CONSTRAINT marketplace_offers_pkey PRIMARY KEY (id);


--
-- Name: marketplace_partners marketplace_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.marketplace_partners
    ADD CONSTRAINT marketplace_partners_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: occurrences occurrences_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.occurrences
    ADD CONSTRAINT occurrences_pkey PRIMARY KEY (id);


--
-- Name: panic_alerts panic_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.panic_alerts
    ADD CONSTRAINT panic_alerts_pkey PRIMARY KEY (id);


--
-- Name: parcels parcels_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.parcels
    ADD CONSTRAINT parcels_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);


--
-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: renovation_providers renovation_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.renovation_providers
    ADD CONSTRAINT renovation_providers_pkey PRIMARY KEY (id);


--
-- Name: renovations renovations_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.renovations
    ADD CONSTRAINT renovations_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: service_order_checklists service_order_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.service_order_checklists
    ADD CONSTRAINT service_order_checklists_pkey PRIMARY KEY (id);


--
-- Name: service_orders service_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_pkey PRIMARY KEY (id);


--
-- Name: service_providers service_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.service_providers
    ADD CONSTRAINT service_providers_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_access_logs vehicle_access_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.vehicle_access_logs
    ADD CONSTRAINT vehicle_access_logs_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: visitor_qrcode_uses visitor_qrcode_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitor_qrcode_uses
    ADD CONSTRAINT visitor_qrcode_uses_pkey PRIMARY KEY (id);


--
-- Name: visitor_qrcodes visitor_qrcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitor_qrcodes
    ADD CONSTRAINT visitor_qrcodes_pkey PRIMARY KEY (id);


--
-- Name: visitor_recurrences visitor_recurrences_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitor_recurrences
    ADD CONSTRAINT visitor_recurrences_pkey PRIMARY KEY (id);


--
-- Name: visitors visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);


--
-- Name: assembly_attendees_assemblyId_userId_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX "assembly_attendees_assemblyId_userId_key" ON public.assembly_attendees USING btree ("assemblyId", "userId");


--
-- Name: assembly_votes_votingItemId_userId_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX "assembly_votes_votingItemId_userId_key" ON public.assembly_votes USING btree ("votingItemId", "userId");


--
-- Name: condominium_users_userId_condominiumId_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX "condominium_users_userId_condominiumId_key" ON public.condominium_users USING btree ("userId", "condominiumId");


--
-- Name: condominiums_cnpj_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX condominiums_cnpj_key ON public.condominiums USING btree (cnpj);


--
-- Name: digital_signage_screens_token_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX digital_signage_screens_token_key ON public.digital_signage_screens USING btree (token);


--
-- Name: employees_userId_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX "employees_userId_key" ON public.employees USING btree ("userId");


--
-- Name: password_resets_token_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX password_resets_token_key ON public.password_resets USING btree (token);


--
-- Name: permissions_module_action_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX permissions_module_action_key ON public.permissions USING btree (module, action);


--
-- Name: poll_votes_pollId_userId_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX "poll_votes_pollId_userId_key" ON public.poll_votes USING btree ("pollId", "userId");


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: role_permissions_role_permissionId_condominiumId_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX "role_permissions_role_permissionId_condominiumId_key" ON public.role_permissions USING btree (role, "permissionId", "condominiumId");


--
-- Name: units_condominiumId_identifier_block_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX "units_condominiumId_identifier_block_key" ON public.units USING btree ("condominiumId", identifier, block);


--
-- Name: users_cpf_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX users_cpf_key ON public.users USING btree (cpf);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: vehicles_plate_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX vehicles_plate_key ON public.vehicles USING btree (plate);


--
-- Name: visitor_qrcodes_token_key; Type: INDEX; Schema: public; Owner: condosync
--

CREATE UNIQUE INDEX visitor_qrcodes_token_key ON public.visitor_qrcodes USING btree (token);


--
-- Name: condominium_users condominium_users_validate_unit; Type: TRIGGER; Schema: public; Owner: condosync
--

CREATE TRIGGER condominium_users_validate_unit BEFORE INSERT OR UPDATE ON public.condominium_users FOR EACH ROW EXECUTE FUNCTION public.validate_condominium_user_unit();


--
-- Name: announcements announcements_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT "announcements_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: area_blocked_periods area_blocked_periods_commonAreaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.area_blocked_periods
    ADD CONSTRAINT "area_blocked_periods_commonAreaId_fkey" FOREIGN KEY ("commonAreaId") REFERENCES public.common_areas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assemblies assemblies_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assemblies
    ADD CONSTRAINT "assemblies_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assembly_attendees assembly_attendees_assemblyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assembly_attendees
    ADD CONSTRAINT "assembly_attendees_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES public.assemblies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assembly_votes assembly_votes_votingItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assembly_votes
    ADD CONSTRAINT "assembly_votes_votingItemId_fkey" FOREIGN KEY ("votingItemId") REFERENCES public.assembly_voting_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assembly_voting_items assembly_voting_items_assemblyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.assembly_voting_items
    ADD CONSTRAINT "assembly_voting_items_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES public.assemblies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: charges charges_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.charges
    ADD CONSTRAINT "charges_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.financial_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: charges charges_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.charges
    ADD CONSTRAINT "charges_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.financial_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: charges charges_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.charges
    ADD CONSTRAINT "charges_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_messages chat_messages_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.chat_conversations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_messages chat_messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: collection_steps collection_steps_ruleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.collection_steps
    ADD CONSTRAINT "collection_steps_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES public.collection_rules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: common_areas common_areas_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.common_areas
    ADD CONSTRAINT "common_areas_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: condominium_documents condominium_documents_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominium_documents
    ADD CONSTRAINT "condominium_documents_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: condominium_users condominium_users_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominium_users
    ADD CONSTRAINT "condominium_users_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: condominium_users condominium_users_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominium_users
    ADD CONSTRAINT "condominium_users_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: condominium_users condominium_users_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.condominium_users
    ADD CONSTRAINT "condominium_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contracts contracts_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "contracts_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: contracts contracts_serviceProviderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT "contracts_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES public.service_providers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dependents dependents_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.dependents
    ADD CONSTRAINT "dependents_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: digital_signage_slides digital_signage_slides_screenId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.digital_signage_slides
    ADD CONSTRAINT "digital_signage_slides_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES public.digital_signage_screens(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: financial_accounts financial_accounts_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.financial_accounts
    ADD CONSTRAINT "financial_accounts_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: financial_transactions financial_transactions_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT "financial_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.financial_accounts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: financial_transactions financial_transactions_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.financial_transactions
    ADD CONSTRAINT "financial_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.financial_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lost_and_found lost_and_found_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.lost_and_found
    ADD CONSTRAINT "lost_and_found_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lost_and_found lost_and_found_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.lost_and_found
    ADD CONSTRAINT "lost_and_found_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maintenance_schedules maintenance_schedules_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.maintenance_schedules
    ADD CONSTRAINT "maintenance_schedules_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: marketplace_offers marketplace_offers_partnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.marketplace_offers
    ADD CONSTRAINT "marketplace_offers_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES public.marketplace_partners(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: occurrences occurrences_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.occurrences
    ADD CONSTRAINT "occurrences_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: panic_alerts panic_alerts_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.panic_alerts
    ADD CONSTRAINT "panic_alerts_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: parcels parcels_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.parcels
    ADD CONSTRAINT "parcels_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: password_resets password_resets_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pets pets_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT "pets_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_pollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT "poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public.polls(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: polls polls_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT "polls_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: refresh_tokens refresh_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: renovation_providers renovation_providers_renovationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.renovation_providers
    ADD CONSTRAINT "renovation_providers_renovationId_fkey" FOREIGN KEY ("renovationId") REFERENCES public.renovations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: renovations renovations_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.renovations
    ADD CONSTRAINT "renovations_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reservations reservations_commonAreaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT "reservations_commonAreaId_fkey" FOREIGN KEY ("commonAreaId") REFERENCES public.common_areas(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: role_permissions role_permissions_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: service_order_checklists service_order_checklists_serviceOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.service_order_checklists
    ADD CONSTRAINT "service_order_checklists_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES public.service_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: service_orders service_orders_serviceProviderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT "service_orders_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES public.service_providers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_orders service_orders_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT "service_orders_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_providers service_providers_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.service_providers
    ADD CONSTRAINT "service_providers_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public.stock_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_messages ticket_messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "ticket_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ticket_messages ticket_messages_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tickets tickets_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: units units_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT "units_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: vehicle_access_logs vehicle_access_logs_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.vehicle_access_logs
    ADD CONSTRAINT "vehicle_access_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vehicles vehicles_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT "vehicles_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: visitor_qrcode_uses visitor_qrcode_uses_qrcodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitor_qrcode_uses
    ADD CONSTRAINT "visitor_qrcode_uses_qrcodeId_fkey" FOREIGN KEY ("qrcodeId") REFERENCES public.visitor_qrcodes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: visitor_qrcodes visitor_qrcodes_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitor_qrcodes
    ADD CONSTRAINT "visitor_qrcodes_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: visitor_recurrences visitor_recurrences_condominiumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitor_recurrences
    ADD CONSTRAINT "visitor_recurrences_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES public.condominiums(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: visitor_recurrences visitor_recurrences_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitor_recurrences
    ADD CONSTRAINT "visitor_recurrences_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: visitors visitors_serviceProviderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT "visitors_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES public.service_providers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: visitors visitors_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: condosync
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT "visitors_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: condosync
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict FPJt2Am4WVcYYjNbtPZV0UQNTq420aLk9PlsifNuwCLK7jR0S3q54meOa2H0iO8

