"use client"

import { useEffect, useState } from "react"
import { authClient } from "../../auth-client"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Info, Check, X, Loader2 } from "lucide-react"

export default function Consent() {
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestedScopes, setRequestedScopes] = useState<string[]>([])
  const [acceptedScopes, setAcceptedScopes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadClientInfo() {
      // Get client_id and scope from URL search params
      const params = new URLSearchParams(window.location.search)
      const clientId = params.get("client_id")
      const scopeParam = params.get("scope")

      if (!clientId) {
        setError("Invalid request: Missing client_id")
        setLoading(false)
        return
      }

      const scopes = scopeParam ? scopeParam.split(" ") : []
      setRequestedScopes(scopes)
      
      const initialScopes: Record<string, boolean> = {}
      scopes.forEach(s => { initialScopes[s] = true })
      setAcceptedScopes(initialScopes)

      try {
        const { data, error } = await authClient.oauth2.publicClient({
          query: { client_id: clientId }
        })

        if (error) {
          setError(error.message ?? "Failed to load application info")
        } else {
          setClientInfo(data)
        }
      } catch (err: any) {
        setError("An unexpected error occurred while loading client info")
      } finally {
        setLoading(false)
      }
    }

    loadClientInfo()
  }, [])

  const handleConsent = async (accept: boolean) => {
    try {
      if (!accept) {
        await authClient.oauth2.consent({ accept: false })
        return
      }

      // Filter accepted scopes
      const finalScopes = Object.keys(acceptedScopes).filter(
        scope => acceptedScopes[scope]
      )

      await authClient.oauth2.consent({
        accept: true,
        scope: finalScopes.join(" ")
      })
    } catch (err) {
      setError("Failed to process your consent")
    }
  }

  const toggleScope = (scope: string) => {
    // Prevent toggling openid as it's required for OIDC
    if (scope === "openid") return
    
    setAcceptedScopes(prev => ({
      ...prev,
      [scope]: !prev[scope]
    }))
  }

  if (loading) {
    return (
      <Card className="mx-auto w-full max-w-sm">
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Loading application details...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mx-auto w-full max-w-sm border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <ShieldAlert className="h-5 w-5" />
            <CardTitle>Authorization Error</CardTitle>
          </div>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const getScopeDescription = (scope: string) => {
    switch (scope) {
      case "openid": return "Authenticate your identity"
      case "profile": return "Access your basic profile information (name, picture)"
      case "email": return "Access your email address"
      case "offline_access": return "Maintain access to your data when you're not actively using the app (offline access)"
      default: return `Access ${scope}`
    }
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-primary font-semibold text-xl">
          {clientInfo?.client_name?.substring(0, 2).toUpperCase() || "APP"}
        </div>
        <CardTitle className="text-xl">
          {clientInfo?.client_name || "An application"}
        </CardTitle>
        <CardDescription className="text-base mt-2">
          is requesting access to your IAM account
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" /> This application will be able to:
          </p>
          
          <ul className="space-y-3">
            {requestedScopes.map(scope => (
              <li key={scope} className="flex items-start gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className={`h-5 w-5 shrink-0 rounded-full border ${acceptedScopes[scope] ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:bg-accent'} ${scope === 'openid' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => toggleScope(scope)}
                >
                  {acceptedScopes[scope] ? <Check className="h-3 w-3" /> : null}
                </Button>
                <div className="text-sm">
                  <span className="font-medium block">{scope}</span>
                  <span className="text-muted-foreground text-xs block mt-0.5">
                    {getScopeDescription(scope)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-3">
        <Button 
          variant="outline" 
          className="w-full flex-1"
          onClick={() => handleConsent(false)}
        >
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button 
          className="w-full flex-1"
          onClick={() => handleConsent(true)}
        >
          <Check className="mr-2 h-4 w-4" /> Allow
        </Button>
      </CardFooter>
    </Card>
  )
}
