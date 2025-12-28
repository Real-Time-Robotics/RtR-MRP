"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Warehouse, Factory, Check } from "lucide-react";

interface Site {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  type: string;
  isActive: boolean;
  warehouses?: Array<{ id: string; name: string }>;
}

interface SiteSelectorProps {
  sites: Site[];
  selectedSiteId?: string | null;
  onSelect: (siteId: string | null) => void;
  showAllOption?: boolean;
}

export function SiteSelector({
  sites,
  selectedSiteId,
  onSelect,
  showAllOption = true,
}: SiteSelectorProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "WAREHOUSE":
        return <Warehouse className="h-5 w-5" />;
      case "MANUFACTURING":
        return <Factory className="h-5 w-5" />;
      case "DISTRIBUTION":
        return <Building2 className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "WAREHOUSE":
        return "bg-blue-100 text-blue-800";
      case "MANUFACTURING":
        return "bg-purple-100 text-purple-800";
      case "DISTRIBUTION":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-3">
      {showAllOption && (
        <Card
          className={`cursor-pointer transition-all ${
            selectedSiteId === null
              ? "ring-2 ring-primary border-primary"
              : "hover:border-primary/50"
          }`}
          onClick={() => onSelect(null)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">All Sites</div>
                <div className="text-sm text-muted-foreground">
                  View combined data from all locations
                </div>
              </div>
            </div>
            {selectedSiteId === null && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sites.map((site) => (
          <Card
            key={site.id}
            className={`cursor-pointer transition-all ${
              selectedSiteId === site.id
                ? "ring-2 ring-primary border-primary"
                : "hover:border-primary/50"
            } ${!site.isActive ? "opacity-60" : ""}`}
            onClick={() => site.isActive && onSelect(site.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getTypeColor(site.type)}`}>
                    {getTypeIcon(site.type)}
                  </div>
                  <div>
                    <div className="font-medium">{site.name}</div>
                    <div className="text-sm text-muted-foreground">{site.code}</div>
                  </div>
                </div>
                {selectedSiteId === site.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                {site.address && (
                  <div className="text-xs text-muted-foreground truncate">
                    {site.address}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getTypeColor(site.type)}>
                    {site.type}
                  </Badge>
                  {!site.isActive && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {site.warehouses && site.warehouses.length > 0 && (
                    <Badge variant="outline">
                      {site.warehouses.length} warehouse(s)
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sites.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No sites configured. Create a site to enable multi-site planning.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
