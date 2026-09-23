"use client";

// GlobalUsersMap — choropleth world map showing event distribution by country.
// The gateway enriches every event with an ISO alpha-2 country code resolved
// from the client IP and stores it in the `region` column. This component
// receives per-country counts from ClickHouse and colours the map accordingly.
import { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GeoCountBucket } from "@/lib/clickhouse";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 numeric → alpha-2 lookup used to join topology IDs with ClickHouse rows.
const ISO_NUMERIC: Record<string, string> = {
  "4":"AF","8":"AL","12":"DZ","24":"AO","32":"AR","36":"AU","40":"AT","50":"BD",
  "56":"BE","64":"BT","68":"BO","76":"BR","100":"BG","116":"KH","120":"CM","124":"CA",
  "144":"LK","148":"TD","152":"CL","156":"CN","170":"CO","178":"CG","180":"CD","188":"CR",
  "191":"HR","192":"CU","196":"CY","203":"CZ","208":"DK","214":"DO","218":"EC","222":"SV",
  "226":"GQ","231":"ET","232":"ER","246":"FI","250":"FR","262":"DJ","266":"GA","268":"GE",
  "270":"GM","276":"DE","288":"GH","300":"GR","320":"GT","324":"GN","332":"HT","340":"HN",
  "348":"HU","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL","380":"IT",
  "384":"CI","388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR",
  "414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","430":"LR","434":"LY","440":"LT",
  "442":"LU","450":"MG","454":"MW","458":"MY","466":"ML","478":"MR","484":"MX","496":"MN",
  "498":"MD","499":"ME","504":"MA","508":"MZ","516":"NA","524":"NP","528":"NL","554":"NZ",
  "558":"NI","562":"NE","566":"NG","578":"NO","586":"PK","591":"PA","600":"PY","604":"PE",
  "608":"PH","616":"PL","620":"PT","624":"GW","630":"PR","634":"QA","642":"RO","643":"RU",
  "646":"RW","678":"ST","682":"SA","686":"SN","688":"RS","694":"SL","703":"SK","704":"VN",
  "705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES","736":"SD","748":"SZ","752":"SE",
  "756":"CH","760":"SY","762":"TJ","764":"TH","768":"TG","784":"AE","788":"TN","792":"TR",
  "795":"TM","800":"UG","804":"UA","807":"MK","818":"EG","826":"GB","834":"TZ","840":"US",
  "854":"BF","858":"UY","860":"UZ","862":"VE","887":"YE","894":"ZM","108":"BI","112":"BY",
  "140":"CF","31":"AZ","51":"AM","70":"BA","72":"BW",
};

// Country name lookup for tooltips
const ISO_NAMES: Record<string, string> = {
  "AF":"Afghanistan","AL":"Albania","DZ":"Algeria","AO":"Angola","AR":"Argentina",
  "AU":"Australia","AT":"Austria","BD":"Bangladesh","BE":"Belgium","BR":"Brazil",
  "CA":"Canada","CL":"Chile","CN":"China","CO":"Colombia","CD":"DR Congo","HR":"Croatia",
  "CZ":"Czech Republic","DK":"Denmark","EG":"Egypt","FI":"Finland","FR":"France",
  "DE":"Germany","GH":"Ghana","GR":"Greece","HU":"Hungary","IN":"India","ID":"Indonesia",
  "IR":"Iran","IQ":"Iraq","IE":"Ireland","IL":"Israel","IT":"Italy","JP":"Japan",
  "JO":"Jordan","KZ":"Kazakhstan","KE":"Kenya","KR":"South Korea","MY":"Malaysia",
  "MX":"Mexico","MA":"Morocco","NL":"Netherlands","NZ":"New Zealand","NG":"Nigeria",
  "NO":"Norway","PK":"Pakistan","PE":"Peru","PH":"Philippines","PL":"Poland","PT":"Portugal",
  "RO":"Romania","RU":"Russia","SA":"Saudi Arabia","RS":"Serbia","ZA":"South Africa",
  "ES":"Spain","SE":"Sweden","CH":"Switzerland","TH":"Thailand","TR":"Turkey",
  "UA":"Ukraine","AE":"United Arab Emirates","GB":"United Kingdom","US":"United States",
  "UY":"Uruguay","UZ":"Uzbekistan","VE":"Venezuela","VN":"Vietnam","ZW":"Zimbabwe",
};

// Log-scale colour for event density (low → high)
const SCALE = ["#f0f9ff","#bae6fd","#7dd3fc","#38bdf8","#0ea5e9","#0284c7","#0369a1"];

function densityColor(count: number, max: number): string {
  if (!count || !max) return "#e5e7eb";
  const n = Math.log1p(count) / Math.log1p(max);
  return SCALE[Math.min(Math.floor(n * SCALE.length), SCALE.length - 1)] ?? SCALE[0]!;
}

interface TooltipState { name: string; count: number; x: number; y: number }

interface GlobalUsersMapProps {
  data: GeoCountBucket[];
}

export function GlobalUsersMap({ data }: GlobalUsersMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const maxCount = Math.max(...data.map((r) => r.event_count), 1);
  const countByAlpha2 = new Map(data.map((r) => [r.region.toUpperCase(), r.event_count]));
  const activeCountries = data.filter((r) => r.event_count > 0).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Global event distribution</CardTitle>
        {activeCountries > 0 && (
          <span className="text-xs text-muted-foreground">
            {activeCountries} {activeCountries === 1 ? "country" : "countries"} active
          </span>
        )}
      </CardHeader>
      <CardContent className="relative p-0 pb-2">
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No geographic data yet — events will appear once the gateway resolves client IPs
          </div>
        ) : (
          <div className="relative">
            <ComposableMap
              projectionConfig={{ scale: 130, center: [0, 20] }}
              style={{ width: "100%", height: "auto" }}
            >
              <ZoomableGroup zoom={1}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const alpha2 = ISO_NUMERIC[String(geo.id)] ?? "";
                      const count = countByAlpha2.get(alpha2) ?? 0;
                      const fill = densityColor(count, maxCount);
                      const name = (alpha2 ? (ISO_NAMES[alpha2] ?? alpha2) : `Region ${geo.id}`);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fill}
                          stroke="#ffffff"
                          strokeWidth={0.3}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", opacity: 0.8, cursor: "pointer" },
                            pressed: { outline: "none" },
                          }}
                          onMouseEnter={(e) => {
                            setTooltip({ name, count, x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {tooltip && (
              <div
                className="pointer-events-none fixed z-50 rounded-md border bg-card px-3 py-2 text-xs shadow-md"
                style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
              >
                <p className="font-medium">{tooltip.name}</p>
                {tooltip.count > 0 && (
                  <p className="text-muted-foreground">{tooltip.count.toLocaleString()} events</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
