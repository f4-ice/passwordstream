
const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);

const IdIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9"></line>
    <line x1="4" y1="15" x2="20" y2="15"></line>
    <line x1="10" y1="3" x2="8" y2="21"></line>
    <line x1="16" y1="3" x2="14" y2="21"></line>
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const TextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7"></polyline>
    <line x1="9" y1="20" x2="15" y2="20"></line>
    <line x1="12" y1="4" x2="12" y2="20"></line>
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const TableCard = ({ title, columns }) => {
  return (
    <div className="db-table-card">
      <div className="db-table-header">
        <span className="db-table-icon" style={{ display: 'flex' }}><DatabaseIcon /></span>
        {title}
      </div>
      <div className="db-table-body">
        {columns.map((col, index) => (
          <div key={index} className={`db-table-row ${col.isPk ? 'db-pk' : ''} ${col.isFk ? 'db-fk' : ''}`}>
            <span className="db-col-type" style={{ display: 'flex' }}>{col.typeIcon}</span>
            <span className="db-col-name">{col.name}</span>
            {col.isPk && <span className="db-key-icon" style={{ display: 'flex' }}><KeyIcon /></span>}
            {col.isFk && <span className="db-key-icon fk-icon" style={{ display: 'flex' }}><LinkIcon /></span>}
          </div>
        ))}
      </div>
    </div>
  );
};

const DatabaseSchema = () => {
  return (
    <section className="db-schema-section">
      <div className="features-header">
        <div className="features-badge">Architecture</div>
        <h2>Database Structure</h2>
        <p>A transparent look at our relational data model.</p>
      </div>
      
      <div className="db-schema-scroll-container">
        <div className="db-schema-wrapper">
          {/* SVG Connectors */}
          <svg className="db-connectors" width="100%" height="100%">
            <defs>
              <marker id="circleMarker" markerWidth="8" markerHeight="8" refX="4" refY="4">
                <circle cx="4" cy="4" r="3" fill="#94a3b8" />
              </marker>
              <marker id="diamondMarker" markerWidth="10" markerHeight="10" refX="9" refY="5">
                <path d="M 0 5 L 5 0 L 10 5 L 5 10 Z" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
              </marker>
            </defs>
            
            {/* shares.sender_id to users.id */}
            <path d="M 280 125 L 350 125 L 350 200 L 450 200" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" markerStart="url(#circleMarker)" markerEnd="url(#diamondMarker)" />
            
            {/* shares.receiver_id to users.id */}
            <path d="M 280 160 L 320 160 L 320 220 L 450 220" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" markerStart="url(#circleMarker)" markerEnd="url(#diamondMarker)" />
            
            {/* vault_items.user_id to users.id */}
            <path d="M 280 435 L 350 435 L 350 350 L 450 350" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4" markerStart="url(#circleMarker)" markerEnd="url(#diamondMarker)" />
          </svg>

          {/* Left Column */}
          <div className="db-col-left">
            <div className="db-table-wrapper" style={{ top: '20px' }}>
              <TableCard 
                title="shares"
                columns={[
                  { name: 'id', typeIcon: <IdIcon />, isPk: true },
                  { name: 'sender_id', typeIcon: <UserIcon />, isFk: true },
                  { name: 'receiver_id', typeIcon: <UserIcon />, isFk: true },
                  { name: 'encrypted_payload', typeIcon: <TextIcon /> },
                  { name: 'signature', typeIcon: <TextIcon /> },
                  { name: 'created_at', typeIcon: <ClockIcon /> }
                ]}
              />
            </div>
            
            <div className="db-table-wrapper" style={{ top: '330px' }}>
              <TableCard 
                title="vault_items"
                columns={[
                  { name: 'id', typeIcon: <IdIcon />, isPk: true },
                  { name: 'user_id', typeIcon: <UserIcon />, isFk: true },
                  { name: 'encrypted_payload', typeIcon: <TextIcon /> },
                  { name: 'iv', typeIcon: <TextIcon /> },
                  { name: 'created_at', typeIcon: <ClockIcon /> },
                  { name: 'updated_at', typeIcon: <ClockIcon /> }
                ]}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="db-col-right" style={{ left: '460px', top: '100px' }}>
            <TableCard 
              title="users"
              columns={[
                { name: 'id', typeIcon: <IdIcon />, isPk: true },
                { name: 'email', typeIcon: <TextIcon /> },
                { name: 'auth_key_hash', typeIcon: <TextIcon /> },
                { name: 'public_rsa_key', typeIcon: <TextIcon /> },
                { name: 'encrypted_private_rsa_key', typeIcon: <TextIcon /> },
                { name: 'public_ecdsa_key', typeIcon: <TextIcon /> },
                { name: 'encrypted_private_ecdsa_key', typeIcon: <TextIcon /> },
                { name: 'created_at', typeIcon: <ClockIcon /> }
              ]}
            />
          </div>

        </div>
      </div>
    </section>
  );
};

export default DatabaseSchema;
