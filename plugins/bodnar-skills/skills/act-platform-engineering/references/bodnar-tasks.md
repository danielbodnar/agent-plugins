# Current Bodnar Tasks (Neutral Voice, Category-Grouped)

This is the current state of the task list for the Internal Needs project. Use this for context when drafting new items to avoid duplication.

## Platform Engineering & Automation

* Platform Engineering Repository
   * Sysadmin and server management lacks automation. Restoring access and provisioning a new user currently requires significant manual effort across multiple systems
   * A GitLab repo needs to become the source of truth for all server configs and infrastructure. If a server crashes tomorrow, there should be a way to redeploy it from this repo
   * Start by migrating one server as a proof of concept, then move the rest over one at a time
   * This also means copying all existing server configs into the repo so there is actually a record of whats running where
   * Addresses failover readiness (Miller) and script cleanup and efficiency improvements (Zach) by giving us a foundation to build on

* General Cleanup and Consolidation
   * Reports and scripts are scattered everywhere. The naming is inconsistent and its not always obvious what they do
   * There needs to be a centralized place these all run thats clean and easy to understand and maintain
   * Catalog whats out there, remove whats dead, and consolidate into the platform engineering repo with consistent naming

* Automate User Provisioning and VPN Setup
   * Provisioning a new sysadmin with access across all servers is a multi-day manual process. An automated workflow is needed that handles user accounts, SSH keys, and WireGuard profiles across the full fleet
   * Builds on the platform engineering repo work

## Reliability & Failover

* Failover and Reliability (long burn, can be worked in tandem with other tasks)
   * Keeping the payment gateway service and pimsserver instances online and available is key
   * The pimsserver db can be overloaded by data traffic which could result in instability that spills over into payments
   * DNS and routing issues also need to be addressed
   * There is no clear answer to what happens if a server crashes or whether db backups are current
   * There is no defined alerting. If something goes wrong, its unclear who gets notified and how

* Automatic Database Failover
   * If dbprimary goes down, failover is currently manual or undefined. Automated promotion and connection routing are needed so there is no scramble during an outage
   * Ties directly into the broader failover and reliability work

* Dead Backup Servers
   * Backup servers have been non-functional for an extended period. This is a data safety gap that needs to be resolved before anything else can be confidently addressed
   * The hardware needs to be diagnosed as recoverable or replaced, and backups need to be functional again

* Horizontal Scaling Plan
   * Pimsserver, payment gateway, and appserver are all single-instance. If one goes down, everything it supports goes with it
   * A plan is needed for how these services scale beyond single instances. This is a planning exercise now but it feeds into the long term reliability picture

## Database Performance & Scaling

* Reporting Performance
   * Report queries need to be improved so the reports themselves take less time
   * Miller's report scripts should be converted into efficient materialized views. This was investigated last week and proposed solutions are ready to implement
   * Indexes need to be vacuumed and missing indexes identified in the investigation need to be added
   * Reports should be fully automated so everyone who needs them gets them
   * This is also a good time to consider whether any reports could be replaced with a dashboard or other solution (requires PM input)

* Filesystem Tuning on DB Primary
   * When dbprimary was upgraded to add storage, several significant filesystem tuning mechanisms were overlooked. ZFS recordsize, compression, kernel parameters, all of which directly impact database performance
   * Current settings need to be audited against best practices and a remediation plan developed. Some changes require careful planning

* Database Sharding and Scaling Strategy
   * Longer term, there should be a documented plan for what database scaling looks like beyond single-primary replication. Read replica routing for reports, connection pooling, whether sharding makes sense for current and projected data volumes
   * No urgency but the conversation should be documented

## Observability & Monitoring

* Deploy Observability Stack
   * There is no centralized visibility into the infrastructure. Grafana, Netdata on all servers, and centralized log management all need to be deployed
   * Once this is up, most monitoring needs become straightforward. Without it the team is flying blind

* Centralized Log Management
   * There is no aggregated view of logs across the infrastructure. Troubleshooting currently means SSH-ing into individual boxes and grepping through journals
   * Should tie into the Grafana and Netdata observability work

## Infrastructure & Hardware

* Failing Hard Drives in PVE3
   * PVE3 has drives that are failing or already failed. Replacements need to go in and pool health needs to be verified after resilver
   * Work with Miller

* Provision and Install New Dell PowerEdge 730
   * This is the new machine for expanding the VM fleet. Needs Proxmox installed, ZFS storage configured, and cluster membership established
   * Work with Miller

* Virtual Environment ("Pims Garden")
   * VMs have become increasingly important as test environments for dev, QA, and PIMS experts. The VM list is expanding and moving to a new machine
   * Current plans should be evaluated for improvements. The goal is to be able to deploy new VMs and give devs and non-devs access to these machines internally

## CI/CD & Deployment

* Pipeline and Deployment Improvement
   * There is a general CI/CD pipeline now but standardized test environments are needed
   * Parts of VSmartClient are dependent on a Windows GitLab runner and have to be manually built for current publishes. A Windows runner is needed so the full build process has no manual steps where devs can make mistakes

* Pimsserver Branch Consolidation
   * The pimsserver is split between the master and betabeta images due to a divergence long ago around processing data. A safe plan is needed to confirm these can now be merged while preserving data fidelity
   * Receiving new data, updates, deletes, and relations all need to work properly before any migration

## Documentation

* Internal Documentation Platform
   * There is no single source of truth for internal documentation. A platform is needed thats searchable, version-controlled, and accessible to dev and non-dev staff
   * Start with a prototype covering one area (like sysadmin runbooks) and expand from there

## Security

* Secrets Management
   * Service accounts and credentials are managed ad-hoc. A proper secrets management solution is needed for CI/CD pipelines and production environments
   * This also needs to address rotation policies so credentials arent running unchanged indefinitely
