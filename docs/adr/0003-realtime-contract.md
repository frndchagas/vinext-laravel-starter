# ADR 0003: realtime contract

Status: accepted.
Implementation: complete.

AsyncAPI defines contracted Reverb channels and message payloads; OpenAPI remains limited to HTTP. Realtime messages report state that is already persisted, and consumers rebuild current state through the API after disconnection. Duplicates and loss are possible.

The official AsyncAPI parser validates and dereferences the document before a repository generator emits every named schema and an operation manifest. The generator records all channels, rejects orphaned or duplicate messages and fails on unsupported schema semantics. PHP tests require an event fixture for every operation message, compare private channels with Laravel authorization and validate each payload. They also keep the HTTP, realtime and PHP Task states equal. Production broadcasting does not parse the contract.

Hand-written TypeScript event types were rejected because they duplicate the neutral contract. Event sourcing was rejected because the starter needs change notifications rather than a durable event log. The AsyncAPI CLI and Modelina were rejected because they add parser, generator and Studio dependency trees that are unnecessary for this contract. The local generator supports only the schema subset covered by its TypeScript and PHP tests.
