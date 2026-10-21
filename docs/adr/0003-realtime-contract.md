# ADR 0003: realtime contract

Status: accepted.
Implementation: complete.

AsyncAPI defines contracted Reverb channels and message payloads; OpenAPI remains limited to HTTP. Realtime messages report state that is already persisted, and consumers rebuild current state through the API after disconnection. Duplicates and loss are possible.

The official AsyncAPI parser validates and dereferences the document before a repository generator emits every named schema and an operation manifest. The generator records all channels, rejects orphaned or duplicate messages and fails on unsupported schema semantics. Production broadcasting does not parse the contract.

Following [ADR 0017](0017-remove-task-example.md), the current contract contains the verified User's private connectivity channel and no application messages. New messages must include PHP event conformance tests for channel authorization and payloads.

Hand-written TypeScript event types were rejected because they duplicate the neutral contract. Event sourcing was rejected because the starter needs change notifications rather than a durable event log. The AsyncAPI CLI and Modelina were rejected because they add parser, generator and Studio dependency trees that are unnecessary for this contract. The local generator supports only the schema subset covered by its TypeScript and PHP tests.
