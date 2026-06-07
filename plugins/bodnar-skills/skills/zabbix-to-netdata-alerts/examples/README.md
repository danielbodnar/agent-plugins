# Example Zabbix exports

Real Zabbix 4.4 exports used to develop and test this skill. They contain
internal hostnames and database names; treat as sensitive.

- zbx_export_hosts__4_.xml      hosts export (82 hosts, ~28 triggers)
- zbx_export_templates.xml      templates export (292 templates, ~546 triggers)

Use as parser and conversion fixtures:
  ./scripts/init
  ./scripts/parse-zabbix-export examples/zbx_export_hosts__4_.xml | head
