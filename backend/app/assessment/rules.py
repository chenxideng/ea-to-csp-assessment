"""
CSP Migration Assessment Rules

Defines how each Azure resource type should be evaluated when migrating
from EA / Web Direct to CSP. Categories:

  EASY       – Can be transferred directly via subscription transfer
  MODERATE   – Transferable but needs config tweaks or brief downtime
  HARD       – Requires redeployment / recreation in the target CSP subscription
  NOT_SUPPORTED – Resource cannot exist under CSP or has known blockers
  NEEDS_REVIEW  – Must be manually reviewed by a solutions architect
"""

from app.models.schemas import MigrationDifficulty, AccountType

# ── Resource type → assessment rule mapping ────────────────────
# Keys are lowercased Azure resource type strings.
# Each value is a dict with:
#   difficulty  – default difficulty rating
#   reason      – short explanation
#   recommendations – list of action items
#   risks       – potential issues
#   downtime    – estimated downtime description

RESOURCE_RULES: dict[str, dict] = {
    # ── Compute ────────────────────────────────────────────────
    "microsoft.compute/virtualmachines": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "VMs transfer with the subscription. No redeployment needed.",
        "recommendations": [
            "Verify VM extensions compatibility under CSP",
            "Check if any VM is part of a Reserved Instance (RI) — RIs do NOT transfer",
            "Review VM size availability in the target CSP region",
        ],
        "risks": [
            "Reserved Instances are non-transferable and must be repurchased",
            "Hybrid Benefit (AHUB) licensing may change under CSP",
        ],
        "downtime": "No downtime for transfer",
    },
    "microsoft.compute/virtualmachinescalesets": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "VMSS transfers with subscription. Scaling policies persist.",
        "recommendations": [
            "Validate auto-scale rules after transfer",
            "Confirm custom script extensions still work",
        ],
        "risks": ["Autoscale policies may need re-validation"],
        "downtime": "No downtime for transfer",
    },
    "microsoft.compute/disks": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Managed disks transfer with VMs or independently.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.compute/availabilitysets": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Availability sets transfer with the subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    # ── Containers ─────────────────────────────────────────────
    "microsoft.containerservice/managedclusters": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "AKS clusters transfer, but RBAC bindings and AAD integration may need reconfiguration.",
        "recommendations": [
            "Review AAD integration and RBAC role assignments",
            "Verify Container Registry access after transfer",
            "Test ingress controller and cert-manager configs",
        ],
        "risks": [
            "AAD-integrated clusters may lose role assignments",
            "Pods referencing managed identities may break",
        ],
        "downtime": "Brief control-plane interruption possible",
    },
    "microsoft.containerregistry/registries": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "ACR transfers with subscription. Images are preserved.",
        "recommendations": [
            "Re-assign pull permissions for AKS/ACI after transfer",
        ],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.containerinstance/containergroups": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Container Instances transfer with subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    # ── Networking ─────────────────────────────────────────────
    "microsoft.network/virtualnetworks": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "VNets transfer with subscription. Peerings remain intact.",
        "recommendations": [
            "Verify VNet peering still works if peered VNets are in other subscriptions",
            "Review NSG and route table associations",
        ],
        "risks": [
            "Cross-subscription peerings may break if the peer is not transferred",
        ],
        "downtime": "None",
    },
    "microsoft.network/networksecuritygroups": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "NSGs transfer with the subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.network/publicipaddresses": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Public IPs transfer and retain their addresses.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.network/loadbalancers": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Load balancers transfer with subscription.",
        "recommendations": ["Verify backend pool associations"],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.network/applicationgateways": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Application Gateways transfer, but WAF policies and certs may need review.",
        "recommendations": [
            "Review SSL certificate bindings",
            "Verify Key Vault references for certificates",
            "Check WAF custom rules",
        ],
        "risks": ["Key Vault access policies may need updating"],
        "downtime": "Brief interruption during DNS re-validation",
    },
    "microsoft.network/vpngateways": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "VPN Gateways transfer, but IPSec tunnels may need reconfiguration.",
        "recommendations": [
            "Re-validate VPN tunnel connections after transfer",
            "Update on-premises VPN device configurations if needed",
        ],
        "risks": ["On-premises connectivity interruption during transfer"],
        "downtime": "Minutes to hours depending on tunnel count",
    },
    "microsoft.network/expressroutecircuits": {
        "difficulty": MigrationDifficulty.HARD,
        "reason": "ExpressRoute circuits require coordination with the provider and Microsoft.",
        "recommendations": [
            "Contact Microsoft support for ExpressRoute transfer process",
            "Coordinate with connectivity provider",
            "Plan maintenance window for network cutover",
        ],
        "risks": [
            "Significant downtime if not carefully planned",
            "Provider peering configurations may need changes",
        ],
        "downtime": "Hours — requires planned maintenance window",
    },
    "microsoft.network/frontdoors": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Front Door transfers but custom domains and WAF policies need review.",
        "recommendations": [
            "Re-validate custom domain CNAME records",
            "Review WAF policy associations",
        ],
        "risks": ["DNS propagation delay may cause brief outage"],
        "downtime": "Minutes for DNS re-validation",
    },
    "microsoft.network/dnszones": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "DNS zones transfer with subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.network/privatednszones": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Private DNS zones transfer with subscription.",
        "recommendations": ["Verify VNet links after transfer"],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.network/privateendpoints": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Private endpoints transfer with subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.network/networkinterfaces": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "NICs transfer with subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    # ── Storage ────────────────────────────────────────────────
    "microsoft.storage/storageaccounts": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Storage accounts transfer with subscription. Data is preserved.",
        "recommendations": [
            "Review access keys rotation policy",
            "Check SAS token expiration and references",
            "Verify private endpoint DNS configuration",
        ],
        "risks": [
            "Applications using access keys will continue to work",
            "SAS tokens remain valid but new ones use CSP billing",
        ],
        "downtime": "None",
    },
    # ── Databases ──────────────────────────────────────────────
    "microsoft.sql/servers": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Azure SQL servers transfer with subscription.",
        "recommendations": [
            "Review firewall rules and VNet integration",
            "Check AAD admin configuration",
            "Verify TDE (Transparent Data Encryption) key management",
        ],
        "risks": [
            "AAD-integrated SQL may need admin re-assignment",
        ],
        "downtime": "None for transfer",
    },
    "microsoft.sql/servers/databases": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "SQL databases transfer with their server.",
        "recommendations": [
            "Review DTU/vCore tier availability under CSP",
        ],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.documentdb/databaseaccounts": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Cosmos DB accounts transfer with subscription.",
        "recommendations": [
            "Verify consistency level and multi-region write settings",
            "Check managed identity access",
        ],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.dbformysql/flexibleservers": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "MySQL Flexible Servers transfer with subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.dbforpostgresql/flexibleservers": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "PostgreSQL Flexible Servers transfer with subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.cache/redis": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Azure Cache for Redis transfers with subscription.",
        "recommendations": ["Verify firewall and VNet rules"],
        "risks": [],
        "downtime": "None",
    },
    # ── Web / App Service ──────────────────────────────────────
    "microsoft.web/serverfarms": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "App Service Plans transfer with subscription.",
        "recommendations": [],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.web/sites": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "App Services transfer, but custom domains and SSL bindings need review.",
        "recommendations": [
            "Re-validate custom domain DNS records",
            "Review managed certificate bindings",
            "Check deployment slots and their configurations",
            "Verify managed identity assignments",
        ],
        "risks": [
            "Custom domain verification may be needed",
            "SSL certificate bindings may need re-binding",
        ],
        "downtime": "Brief interruption for custom domain re-validation",
    },
    "microsoft.web/certificates": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "App Service certificates transfer but may need re-validation.",
        "recommendations": [
            "Verify certificate expiry and renewal settings",
        ],
        "risks": [],
        "downtime": "None",
    },
    # ── Key Vault ──────────────────────────────────────────────
    "microsoft.keyvault/vaults": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Key Vaults transfer, but access policies and RBAC must be reconfigured.",
        "recommendations": [
            "Review and recreate access policies for CSP principals",
            "Verify managed identity access",
            "Check key/secret/certificate rotation schedules",
        ],
        "risks": [
            "Access policies referencing old service principals may break",
            "Soft-delete and purge protection settings persist",
        ],
        "downtime": "None, but access may be temporarily disrupted",
    },
    # ── Messaging ──────────────────────────────────────────────
    "microsoft.servicebus/namespaces": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Service Bus namespaces transfer with subscription.",
        "recommendations": [
            "Review SAS policies and connection strings",
        ],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.eventhub/namespaces": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Event Hub namespaces transfer with subscription.",
        "recommendations": [
            "Review capture settings and storage destinations",
        ],
        "risks": [],
        "downtime": "None",
    },
    # ── Monitoring ─────────────────────────────────────────────
    "microsoft.insights/components": {
        "difficulty": MigrationDifficulty.EASY,
        "reason": "Application Insights components transfer with subscription.",
        "recommendations": [
            "Verify instrumentation keys in applications",
        ],
        "risks": [],
        "downtime": "None",
    },
    "microsoft.operationalinsights/workspaces": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Log Analytics workspaces transfer, but connected sources may need reconfiguration.",
        "recommendations": [
            "Review connected data sources",
            "Verify Sentinel configurations if applicable",
            "Check workspace-level RBAC",
        ],
        "risks": [
            "Data retention policies persist but billing changes",
        ],
        "downtime": "None",
    },
    # ── Identity ───────────────────────────────────────────────
    "microsoft.managedidentity/userassignedidentities": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Managed identities transfer, but role assignments must be reviewed.",
        "recommendations": [
            "Review all RBAC role assignments using this identity",
            "Verify federated credentials if using workload identity",
        ],
        "risks": [
            "Role assignments at subscription scope change with transfer",
        ],
        "downtime": "None",
    },
    # ── AI / Cognitive Services ────────────────────────────────
    "microsoft.cognitiveservices/accounts": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Cognitive Services transfer, but API keys and endpoints persist.",
        "recommendations": [
            "Rotate API keys after transfer for security",
            "Verify custom models and training data",
        ],
        "risks": [],
        "downtime": "None",
    },
    # ── Marketplace ────────────────────────────────────────────
    "microsoft.saas/resources": {
        "difficulty": MigrationDifficulty.NOT_SUPPORTED,
        "reason": "SaaS marketplace resources often cannot be transferred to CSP.",
        "recommendations": [
            "Contact the SaaS vendor about CSP availability",
            "Plan to repurchase through CSP marketplace if available",
        ],
        "risks": [
            "Data migration may be required",
            "Vendor may not support CSP billing",
        ],
        "downtime": "Varies by vendor",
    },
    # ── DevTest Labs ───────────────────────────────────────────
    "microsoft.devtestlab/labs": {
        "difficulty": MigrationDifficulty.HARD,
        "reason": "DevTest Labs may need recreation due to complex policy dependencies.",
        "recommendations": [
            "Export lab configurations",
            "Plan recreation in target subscription",
        ],
        "risks": ["Lab artifacts and custom images need manual migration"],
        "downtime": "Significant — requires recreation",
    },
    # ── Logic Apps / Functions ─────────────────────────────────
    "microsoft.logic/workflows": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Logic Apps transfer, but API connections may need re-authorization.",
        "recommendations": [
            "Review all API connections for re-auth after transfer",
            "Export workflow definitions as backup",
        ],
        "risks": ["API connections using OAuth may break"],
        "downtime": "Minutes for re-authorization",
    },
    "microsoft.web/sites/functions": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Azure Functions transfer via App Service, but bindings may need review.",
        "recommendations": [
            "Verify storage account connections",
            "Review trigger bindings and managed identity access",
        ],
        "risks": [],
        "downtime": "None for transfer, brief for binding updates",
    },
    # ── Data Factory ───────────────────────────────────────────
    "microsoft.datafactory/factories": {
        "difficulty": MigrationDifficulty.MODERATE,
        "reason": "Data Factory transfers, but linked services and IR may need reconfiguration.",
        "recommendations": [
            "Review linked service credentials",
            "Verify Self-Hosted Integration Runtime connectivity",
            "Check managed VNet integration",
        ],
        "risks": [
            "Self-hosted IR may need re-registration",
        ],
        "downtime": "Minutes for IR reconfiguration",
    },
    # ── Synapse ────────────────────────────────────────────────
    "microsoft.synapse/workspaces": {
        "difficulty": MigrationDifficulty.HARD,
        "reason": "Synapse workspaces have complex dependencies that may require recreation.",
        "recommendations": [
            "Export all pipeline and notebook definitions",
            "Document Spark pool configurations",
            "Plan for data migration if using dedicated SQL pools",
        ],
        "risks": [
            "Dedicated SQL pools may need recreation",
            "Managed private endpoints may break",
        ],
        "downtime": "Hours — requires careful planning",
    },
}

# ── Account-type-specific adjustments ──────────────────────────
ACCOUNT_TYPE_NOTES: dict[AccountType, dict] = {
    AccountType.DIRECT_EA: {
        "transfer_method": "Subscription transfer via Azure portal or billing API",
        "special_considerations": [
            "Reserved Instances (RIs) do NOT transfer — must be consumed or repurchased under CSP",
            "Azure Prepayment (Monetary Commitment) balance does not transfer",
            "EA Portal roles and access will be lost",
            "Dev/Test subscriptions must be converted to standard pricing under CSP",
            "Savings Plans may need review for transferability",
        ],
        "estimated_complexity": "Medium",
    },
    AccountType.INDIRECT_EA: {
        "transfer_method": "Requires coordination with current EA partner and new CSP partner",
        "special_considerations": [
            "Current partner must approve or release the enrollment",
            "All Direct EA considerations also apply",
            "Partner-managed resources may have additional access controls",
            "Negotiate EA end-date alignment with CSP start date",
        ],
        "estimated_complexity": "High",
    },
    AccountType.WEB_DIRECT: {
        "transfer_method": "Subscription transfer via Azure portal — simplest path",
        "special_considerations": [
            "Pay-as-you-go subscriptions transfer cleanly to CSP",
            "No reserved instances or commitment concerns (usually)",
            "Credit card billing stops after transfer",
            "Free tier resources may be affected",
        ],
        "estimated_complexity": "Low",
    },
    AccountType.CSP: {
        "transfer_method": "Already under CSP — no migration needed",
        "special_considerations": [
            "If changing CSP partner, use partner-to-partner transfer",
        ],
        "estimated_complexity": "None",
    },
    AccountType.UNKNOWN: {
        "transfer_method": "Contact Microsoft support to determine transfer options",
        "special_considerations": [
            "Account type could not be determined automatically",
            "Manual verification of billing account type required",
        ],
        "estimated_complexity": "Unknown",
    },
}
