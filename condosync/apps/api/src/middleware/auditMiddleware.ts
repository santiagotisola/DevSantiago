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

function extractEntityFromPath(path: string): string {
  // Path format: /api/v1/{entity}/... or /{entity}/...
  const segments = path.split("/").filter(Boolean);
  // Skip "api" and "v1"
  const entitySegment = segments.find(
    (s) => s !== "api" && s !== "v1" && !s.match(/^[0-9a-f-]{36}$/)
  );
  if (entitySegment && PATH_ENTITY_MAP[entitySegment]) {
    return PATH_ENTITY_MAP[entitySegment];
  }
  // Capitalize first letter as fallback
  if (entitySegment) {
    return entitySegment.charAt(0).toUpperCase() + entitySegment.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
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
        const entity = extractEntityFromPath(req.originalUrl || req.path);
        const entityId = req.params.id || body?.data?.id || body?.id;

        auditService
          .log({
            condominiumId: req.user.condominiumId || req.body?.condominiumId,
            userId: req.user.userId,
            action: action as any,
            entity,
            entityId: entityId || undefined,
            changes:
              action === "CREATE"
                ? { after: req.body }
                : action === "DELETE"
                  ? {}
                  : { after: req.body },
            metadata: {
              ip: req.ip || req.socket.remoteAddress,
              userAgent: req.get("user-agent"),
            },
          })
          .catch(() => {}); // fire-and-forget
      }
    }
    return originalJson(body);
  } as any;

  next();
}
