interface Property {
  name: string;
  type: string;
  default?: string;
  description: string;
}

interface PropertyTableProps {
  properties: Property[];
}

export default function PropertyTable({properties}: PropertyTableProps) {
  return (
    <table className="property-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {properties.map((prop) => (
          <tr key={prop.name}>
            <td className="prop-name">{prop.name}</td>
            <td className="prop-type">{prop.type}</td>
            <td className="prop-default">{prop.default || '-'}</td>
            <td>{prop.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
