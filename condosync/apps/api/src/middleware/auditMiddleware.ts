import { Request, Response, NextFunction } from "express";
import { auditService } from "../modules/audit/audit.service";

const METHOD_ACTION_MAP: Record<string, string> = {
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
};

const PATH_ENTITY_MAP: Record<string, string> = {
  visitors: "Visitor",
  parcels: "Parcel",
  units: "Unit",
  residents: "Resident",
  vehicles: "Vehicle",
  employees: "Employee",
  "service-providers": "ServiceProvider",
  communication: "Communication",
  finance: "Finance",
  maintenance: "Maintenance",
  "common-areas": "CommonArea",
  assemblies: "Assembly",
  pets: "Pet",
  "lost-and-found": "LostAndFound",
  documents: "Document",
  renovations: "Renovation",
  stock: "Stock",
  tickets: "Ticket",
  gallery: "Gallery",
  marketplace: "Marketplace",
  panic: "Panic",
  "visitor-recurrences": "VisitorRecurrence",
  "visitor-qrcode": "VisitorQRCode",
  "condominium-contracts": "Contract",
  fines: "Fine",
  "collection-rules": "CollectionRule",
  "digital-signage": "DigitalSignage",
  condominiums: "Condominium",
  users: "User",
  "moving-schedules": "MovingSchedule",
  "key-control": "KeyControl",
  cameras: "Camera",
};

function extractPathSegment(path: string): string | undefined {
  // Path format: /api/v1/{entity}/... or /{entity}/...
  const segments = path.split("/").filter(Boolean);
  // Skip "api" and "v1" e ids (uuid)
  return segments.find(
    (s) => s !== "api" && s !== "v1" && !s.match(/^[0-9a-f-]{36}$/)
  );
}

function mapEntityType(segment: string | undefined): string {
  if (segment && PATH_ENTITY_MAP[segment]) {
    return PATH_ENTITY_MAP[segment];
  }
  if (segment) {
    return (
      segment.charAt(0).toUpperCase() +
      segment.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    );
  }
  return "Unknown";
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only intercept mutating methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  // Skip auth and webhook routes from automatic audit (auth logs manually)
  if (req.path.includes("/auth/") || req.path.includes("/webhooks/")) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const action = METHOD_ACTION_MAP[req.method];
      if (action && req.user) {
        const segment = extractPathSegment(req.originalUrl || req.path);
        const entityType = mapEntityType(segment);
        const entityId = req.params.id || body?.data?.id || body?.id;

        auditService
          .write({
            condominiumId:
              req.user.condominiumId || req.body?.condominiumId || null,
            userId: req.user.userId,
            action,
            module: segment || "unknown",
            entityType,
            entityId: entityId || undefined,
            description: `${action} ${entityType}`,
            metadata: action === "DELETE" ? undefined : { after: req.body },
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get("user-agent") || null,
          })
          .catch(() => {}); // fire-and-forget
      }
    }
    return originalJson(body);
  } as any;

  next();
}
