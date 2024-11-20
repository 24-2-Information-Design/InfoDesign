import { useEffect, useState } from 'react';
import NetworkPie from '../components/graph/NetworkPie';

const Home = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/data.json');
                const jsonData = await response.json();
                setData(jsonData);
            } catch (error) {
                console.log(error);
            }
        };

        fetchData();
    }, []);

    return <div>{data ? <NetworkPie data={data} links={data.links} /> : <div>Loading...</div>}</div>;
};

export default Home;
